
import {device} from "platform";
import * as appSettings from "application-settings";
import * as AppVersion from "nativescript-appversion";
import {TNSRemotePackage} from "./TNSRemotePackage";
import {TNSLocalPackage} from "./TNSLocalPackage";
import {TNSAcquisitionManager} from "./TNSAcquisitionManager";
import {EventEmitter} from "@angular/core";
import {
    Configuration,
    DownloadProgress,
    ILocalPackage,
    InstallMode,
    IPackage,
    IRemotePackage,
    NativeUpdateNotification,
    SyncOptions,
    SyncStatus
} from "./code-push-lib";


export class CodePush {
    public static CURRENT_HASH_KEY: string = "CODEPUSH_CURRENT_HASH"; // same as native
    private static PENDING_HASH_KEY: string = "CODEPUSH_PENDING_HASH"; // same as native
    private static CLEAN_KEY: string = "CODEPUSH_CLEAN"; // same as native (Android)
    private static BINARY_FIRST_RUN_KEY: string = "BINARY_FIRST_RUN";
    private static UNCONFIRMED_INSTALL_KEY: string = "UNCONFIRMED_INSTALL";

    private static syncInProgress = false;

    downloadProgressEvent = new EventEmitter<null | DownloadProgress>();
    installProgressEvent = new EventEmitter<null | number>();
    syncStatusEvent = new EventEmitter<null | SyncStatus>();

    private remotePackage: IRemotePackage | null = null;
    private localPackage: ILocalPackage | null = null;


    sync(options: SyncOptions): Promise<SyncStatus> {
        // if (!options || !options.deploymentKey) {
        //     throw new Error("Missing deploymentKey, pass it as part of the first
        // parameter of the 'sync' function: { deploymentKey: 'your-key' }");
        // }

        if (CodePush.syncInProgress) {
            return Promise.resolve(SyncStatus.IN_PROGRESS);
        }


        CodePush.syncInProgress = true;

        this.cleanPackagesIfNeeded();

        this.notifyApplicationReady(options.deploymentKey);

        this.syncStatusEvent.emit(SyncStatus.CHECKING_FOR_UPDATE);

        // Cast this to any now as we convert the return types in the chaining.
        let updatePromise: any = this.checkForUpdate(options.deploymentKey);

        return updatePromise

        // SUCCESS for Check For Update
        // Next, download it
            .then((remotePackage?: IRemotePackage) => {
                if (!remotePackage) {
                    this.syncStatusEvent.emit(SyncStatus.UP_TO_DATE);
                    CodePush.syncInProgress = false;
                    return Promise.resolve(SyncStatus.UP_TO_DATE);
                }

                if (options.ignoreFailedUpdates === undefined) {
                    options.ignoreFailedUpdates = true;
                }

                const updateShouldBeIgnored = remotePackage.failedInstall && options.ignoreFailedUpdates;
                if (updateShouldBeIgnored) {
                    console.log("An update is available, but it is being ignored due to have been previously rolled back.");
                    this.syncStatusEvent.emit(SyncStatus.UP_TO_DATE);
                    CodePush.syncInProgress = false;
                    return Promise.resolve(SyncStatus.UP_TO_DATE);
                }

                this.syncStatusEvent.emit(SyncStatus.DOWNLOADING_PACKAGE);

                this.remotePackage = remotePackage;
                return remotePackage.download(this.downloadProgressEvent);

            })

            // SUCCESS for Download
            // Next, Install it
            .then((localPackage: ILocalPackage) => {

                this.syncStatusEvent.emit(SyncStatus.INSTALLING_UPDATE);
                this.localPackage = localPackage;
                return localPackage.installWithPromise(this.installProgressEvent);
            })

            // SUCCESS for Install
            // Next, Finish off and return the sync status
            .then((appliedWhen: InstallMode) => {
                // TODO the next action depends on the SyncOptions (but it's hardcoded to ON_NEXT_RESTART currently)
                switch (appliedWhen) {
                    case InstallMode.ON_NEXT_RESTART:
                        console.log("Update is installed and will be run on the next app restart.");
                        break;

                    case InstallMode.ON_NEXT_RESUME:
                        console.log("Update is installed and will be run when the app next resumes.");
                        break;
                }

                appSettings.setString(CodePush.PENDING_HASH_KEY, this.remotePackage.packageHash);
                appSettings.setString(CodePush.CURRENT_HASH_KEY, this.remotePackage.packageHash);

                this.syncStatusEvent.emit(SyncStatus.UPDATE_INSTALLED);
                CodePush.syncInProgress = false;
                return SyncStatus.UPDATE_INSTALLED;
            })
            .catch((error: string) => {
                console.log(error);
                this.syncStatusEvent.emit(SyncStatus.ERROR);
                CodePush.syncInProgress = false;
            });

    }

    private checkForUpdate(deploymentKey: string): Promise<IRemotePackage> {
        const config: Configuration = {
            serverUrl: "https://codepush.azurewebsites.net/",
            appVersion: AppVersion.getVersionNameSync(),
            clientUniqueId: device.uuid,
            deploymentKey: deploymentKey
        };

        return this.getCurrentPackage(config)
            .then((queryPackage?: IPackage) => {
                return new TNSAcquisitionManager(deploymentKey)
                    .queryUpdateWithCurrentPackage(queryPackage);
            })
            .then((result: IRemotePackage | NativeUpdateNotification) => {

                if (!result || (<NativeUpdateNotification>result).updateAppVersion) {
                    return null;
                }

                // At this point we know there's an update available for the current version
                const remotePackage: IRemotePackage = <IRemotePackage>result;

                let tnsRemotePackage: IRemotePackage = new TNSRemotePackage();
                tnsRemotePackage.description = remotePackage.description;
                tnsRemotePackage.label = remotePackage.label;
                tnsRemotePackage.appVersion = remotePackage.appVersion;
                tnsRemotePackage.isMandatory = remotePackage.isMandatory;
                tnsRemotePackage.packageHash = remotePackage.packageHash;
                tnsRemotePackage.packageSize = remotePackage.packageSize;
                tnsRemotePackage.downloadUrl = remotePackage.downloadUrl;
                // the server doesn't send back the deploymentKey
                tnsRemotePackage.deploymentKey = config.deploymentKey;
                // TODO (low prio) see https://github.com/Microsoft/cordova-plugin-code-push/blob/055d9e625d47d56e707d9624c9a14a37736516bb/www/codePush.ts#L182
                // .. or https://github.com/Microsoft/react-native-code-push/blob/2cd2ef0ca2e27a95f84579603c2d222188bb9ce5/CodePush.js#L84
                tnsRemotePackage.failedInstall = false;

                return tnsRemotePackage;
            });

    }

    private getCurrentPackage(config: Configuration): Promise<IPackage> {
        return new Promise((resolve, reject) => {
            resolve({
                appVersion: config.appVersion,
                deploymentKey: config.deploymentKey,
                packageHash: appSettings.getString(CodePush.CURRENT_HASH_KEY),
                isMandatory: false,
                failedInstall: false,
                description: undefined,
                label: undefined,
                packageSize: undefined
            });
        });
    }

    private cleanPackagesIfNeeded(): void {
        const shouldClean = appSettings.getBoolean(CodePush.CLEAN_KEY, false);
        if (!shouldClean) {
            return;
        }
        appSettings.remove(CodePush.CLEAN_KEY);
        appSettings.remove(CodePush.BINARY_FIRST_RUN_KEY);
        TNSLocalPackage.clean();
    }

    private notifyApplicationReady(deploymentKey: string): void {
        if (CodePush.isBinaryFirstRun()) {
            // first run of a binary from the AppStore
            CodePush.markBinaryAsFirstRun();
            new TNSAcquisitionManager(deploymentKey).reportStatusDeploy(null, "DeploymentSucceeded");

        } else if (!CodePush.hasPendingHash()) {
            const currentPackageHash = appSettings.getString(CodePush.CURRENT_HASH_KEY, null);
            if (currentPackageHash !== null && currentPackageHash !== CodePush.firstLaunchValue()) {
                // first run of an update from CodePush
                CodePush.markPackageAsFirstRun(currentPackageHash);
                const currentPackage: ILocalPackage = <ILocalPackage>TNSLocalPackage.getCurrentPackage();
                currentPackage.isFirstRun = true;
                if (currentPackage !== null) {
                    new TNSAcquisitionManager(deploymentKey).reportStatusDeploy(currentPackage, "DeploymentSucceeded");
                }
            }
        }
    }

    private static isBinaryFirstRun(): boolean {
        const firstRunFlagSet = appSettings.getBoolean(CodePush.BINARY_FIRST_RUN_KEY, false);
        console.log("-- firstRunFlagSet? " + firstRunFlagSet);
        return !firstRunFlagSet;
    }

    /**
     * This key exists until a restart is done (removed by native upon start).
     * @returns {boolean}
     */
    private static hasPendingHash(): boolean {
        return appSettings.hasKey(CodePush.PENDING_HASH_KEY);
    }

    private static markBinaryAsFirstRun(): void {
        appSettings.setBoolean(CodePush.BINARY_FIRST_RUN_KEY, true);
    }

    private static firstLaunchValue(): string {
        return appSettings.getString(CodePush.UNCONFIRMED_INSTALL_KEY, null);
    }

    private static markPackageAsFirstRun(pack: string): void {
        appSettings.setString(CodePush.UNCONFIRMED_INSTALL_KEY, pack);
    }
}