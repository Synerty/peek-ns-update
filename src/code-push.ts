/// <reference path="./code-push-lib.d.ts"/>

import {device} from "platform";
import * as appSettings from "application-settings";
import * as AppVersion from "nativescript-appversion";
import {TNSRemotePackage} from "./TNSRemotePackage";
import {TNSLocalPackage} from "./TNSLocalPackage";
import {TNSAcquisitionManager} from "./TNSAcquisitionManager";
import {EventEmitter} from "@angular/core";
import {IRemotePackage} from "./code-push-lib";


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


    sync(options: SyncOptions): Promise<SyncStatus> {
        // if (!options || !options.deploymentKey) {
        //     throw new Error("Missing deploymentKey, pass it as part of the first
        // parameter of the 'sync' function: { deploymentKey: 'your-key' }");
        // }

        if (CodePush.syncInProgress) {
            return Promise.resolve(SyncStatus.IN_PROGRESS);
        }


        CodePush.syncInProgress = true;

        CodePush.cleanPackagesIfNeeded();

        CodePush.notifyApplicationReady(options.deploymentKey);

        this.syncStatusEvent.emit(SyncStatus.CHECKING_FOR_UPDATE);

        return CodePush.checkForUpdate(options.deploymentKey)
            .then((remotePackage?: IRemotePackage) => {
                if (!remotePackage) {
                    this.syncStatusEvent.emit(SyncStatus.UP_TO_DATE);
                    CodePush.syncInProgress = false;
                    return;
                }

                if (options.ignoreFailedUpdates === undefined) {
                    options.ignoreFailedUpdates = true;
                }

                const updateShouldBeIgnored = remotePackage.failedInstall && options.ignoreFailedUpdates;
                if (updateShouldBeIgnored) {
                    console.log("An update is available, but it is being ignored due to have been previously rolled back.");
                    this.syncStatusEvent.emit(SyncStatus.UP_TO_DATE);
                    CodePush.syncInProgress = false;
                    return;
                }

                this.syncStatusEvent.emit(SyncStatus.DOWNLOADING_PACKAGE);

                return remotePackage.download(this.downloadProgressEvent);

            })
            // We've checked for an update, now we should download it.
            .then((localPackage: ILocalPackage) => {

                this.syncStatusEvent.emit(SyncStatus.INSTALLING_UPDATE);
                return localPackage.install(this.installProgressEvent);
            })
            // The INSTALL was a success
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

                appSettings.setString(CodePush.PENDING_HASH_KEY, remotePackage.packageHash);
                appSettings.setString(CodePush.CURRENT_HASH_KEY, remotePackage.packageHash);

                this.syncStatusEvent.emit(SyncStatus.UPDATE_INSTALLED);
                CodePush.syncInProgress = false;
            })
            .catch((error: string) => {
                console.log(error);
                this.syncStatusEvent.emit(SyncStatus.ERROR);
                CodePush.syncInProgress = false;
            });

        // JJC new TNSAcquisitionManager(this.deploymentKey).reportStatusDownload(tnsLocalPackage);

    }

    static checkForUpdate(deploymentKey: string): Promise<IRemotePackage> {
        return new Promise((resolve, reject) => {
            const config: Configuration = {
                serverUrl: "https://codepush.azurewebsites.net/",
                appVersion: AppVersion.getVersionNameSync(),
                clientUniqueId: device.uuid,
                deploymentKey: deploymentKey
            };

            CodePush.getCurrentPackage(config).then((queryPackage?: IPackage) => {
                new TNSAcquisitionManager(deploymentKey).queryUpdateWithCurrentPackage(queryPackage, (error: Error, result: IRemotePackage | NativeUpdateNotification) => {
                    if (error) {
                        reject(error.message || error.toString());
                    }

                    if (!result || (<NativeUpdateNotification>result).updateAppVersion) {
                        resolve(null);
                        return;
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

                    resolve(tnsRemotePackage);
                });
            });
        });
    }

    static getCurrentPackage(config: Configuration): Promise<IPackage> {
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

    private static cleanPackagesIfNeeded(): void {
        const shouldClean = appSettings.getBoolean(CodePush.CLEAN_KEY, false);
        if (!shouldClean) {
            return;
        }
        appSettings.remove(CodePush.CLEAN_KEY);
        appSettings.remove(CodePush.BINARY_FIRST_RUN_KEY);
        TNSLocalPackage.clean();
    }

    static notifyApplicationReady(deploymentKey: string): void {
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