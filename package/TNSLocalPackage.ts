import {Zip} from "nativescript-zip";
import * as fs from "file-system";
import * as fsa from "file-system/file-system-access";
import * as appSettings from "application-settings";
import {isIOS} from "platform";
import * as utils from "utils/utils";
import {TNSAcquisitionManager} from "./TNSAcquisitionManager";
import {CodePush} from "./code-push";
import {EventEmitter} from "@angular/core";
import {
    ErrorCallback,
    ILocalPackage,
    InstallMode,
    InstallOptions,
    IPackage,
    SuccessCallback
} from "./code-push-lib";

declare const com: any;

declare let TNSCodePush:any;

export class TNSLocalPackage implements ILocalPackage {
    // this is the app version at the moment the CodePush package was installed
    private static CODEPUSH_CURRENT_APPVERSION: string = "CODEPUSH_CURRENT_APPVERSION"; // same as native
    private static CODEPUSH_CURRENT_PACKAGE: string = "CODEPUSH_CURRENT_PACKAGE";
    // this is the build timestamp of the app at the moment the CodePush package was installed
    private static CODEPUSH_CURRENT_APPBUILDTIME: string = "CODEPUSH_CURRENT_APPBUILDTIME"; // same as native
    private static CODEPUSH_APK_BUILD_TIME: string = "CODE_PUSH_APK_BUILD_TIME"; // same as include.gradle

    localPath: string;
    isFirstRun: boolean;
    deploymentKey: string;
    description: string;
    label: string;
    appVersion: string;
    isMandatory: boolean;
    packageHash: string;
    packageSize: number;
    failedInstall: boolean;

    install(installSuccess: SuccessCallback<InstallMode>,
            installError?: ErrorCallback,
            installOptions?: InstallOptions): void {
        this.installWithPromise(new EventEmitter<null | number>(), installOptions)
            .then((result: InstallMode) => installSuccess(result))
            .catch((e: string) => installError && installError(new Error(e)));
    }

    installWithPromise(installProgressEvent: EventEmitter<null | number>,
                       installOptions?: InstallOptions): Promise<InstallMode> {

        let appFolderPath = fs.knownFolders.documents().path + "/app";
        let unzipFolderPath = fs.knownFolders.documents().path + "/CodePush-Unzipped/" + this.packageHash;
        let codePushFolder = fs.knownFolders.documents().path + "/CodePush";
        // make sure the CodePush folder exists
        fs.Folder.fromPath(codePushFolder);
        let newPackageFolderPath = fs.knownFolders.documents().path + "/CodePush/" + this.packageHash;
        // in case of a rollback make 'newPackageFolderPath' could already exist, so check and remove
        if (fs.Folder.exists(newPackageFolderPath)) {
            fs.Folder.fromPath(newPackageFolderPath).removeSync();
        }


        return TNSLocalPackage.unzip(
            this.localPath, unzipFolderPath, installProgressEvent
        )
            .then(() => {
                const previousHash = appSettings.getString(CodePush.CURRENT_HASH_KEY, null);
                const isDiffPackage = fs.File.exists(unzipFolderPath + "/hotcodepush.json");
                if (isDiffPackage) {
                    const copySourceFolder = previousHash === null ? appFolderPath : fs.knownFolders.documents().path + "/CodePush/" + previousHash;
                    if (!TNSLocalPackage.copyFolder(copySourceFolder, newPackageFolderPath)) {
                        throw new Error(`Failed to copy ${copySourceFolder} to ${newPackageFolderPath}`);
                    }
                    if (!TNSLocalPackage.copyFolder(unzipFolderPath, newPackageFolderPath)) {
                        throw new Error(`Failed to copy ${unzipFolderPath} to ${newPackageFolderPath}`);
                    }
                } else {
                    new fsa.FileSystemAccess().rename(unzipFolderPath, newPackageFolderPath, (error) => {
                        throw new Error(error);
                    });
                }

                if (!isIOS) {
                    let pendingFolderPath = fs.knownFolders.documents().path + "/CodePush/pending";
                    if (fs.Folder.exists(pendingFolderPath)) {
                        fs.Folder.fromPath(pendingFolderPath).removeSync();
                    }
                    if (!TNSLocalPackage.copyFolder(newPackageFolderPath, pendingFolderPath)) {
                        throw new Error(`Failed to copy ${newPackageFolderPath} to ${pendingFolderPath}`);
                    }
                }

                appSettings.setString(TNSLocalPackage.CODEPUSH_CURRENT_APPVERSION, this.appVersion);
                TNSLocalPackage.saveCurrentPackage(this);

                let buildTime: string;
                // Note that this 'if' hardly justifies subclassing so we're not
                if (isIOS) {
                    const plist = utils.ios.getter(NSBundle, NSBundle.mainBundle).pathForResourceOfType(null, "plist");
                    const fileDate = new fsa.FileSystemAccess().getLastModified(plist);
                    buildTime = "" + fileDate.getTime();
                } else {
                    const codePushApkBuildTimeStringId = utils.ad.resources.getStringId(TNSLocalPackage.CODEPUSH_APK_BUILD_TIME);
                    buildTime = utils.ad.getApplicationContext().getResources().getString(codePushApkBuildTimeStringId);
                }
                appSettings.setString(TNSLocalPackage.CODEPUSH_CURRENT_APPBUILDTIME, buildTime);
                //noinspection JSIgnoredPromiseFromCall (removal is async, don't really care if it fails)
                fs.File.fromPath(this.localPath).remove();

                new TNSAcquisitionManager(this.deploymentKey).reportStatusDownload(this);
                return InstallMode.ON_NEXT_RESTART;
            })
            .catch((e: string) => {
                new TNSAcquisitionManager(this.deploymentKey).reportStatusDeploy(this, "DeploymentFailed");
                throw new Error(e);
            })
    }

    static unzip(archive: string, destination: string,
                 installProgressEvent: EventEmitter<null | number>): Promise<void> {
        if (isIOS) {
            return new Promise<void>((resolve, reject) => {
                TNSCodePush.unzipFileAtPathToDestinationOnProgressOnComplete(
                    archive,
                    destination,
                    (itemNr: number, totalNr: number) => {
                        installProgressEvent.emit(Math.floor((itemNr / totalNr) * 100));
                    },
                    (path: string, success: boolean, error: NSError) => {
                        installProgressEvent.emit(null);
                        if (success)
                            resolve();
                        reject(error ? error.localizedDescription : null);
                    }
                );
            });
        } else {
            return Zip.unzipWithProgress(
                archive, destination,
                progress => installProgressEvent.emit(progress)
            );
        }
    }

    static clean(): void {
        // note that we mustn't call this on Android, but it can't hurt to guard that
        if (!isIOS) {
            return;
        }

        appSettings.remove(TNSLocalPackage.CODEPUSH_CURRENT_APPVERSION);
        appSettings.remove(TNSLocalPackage.CODEPUSH_CURRENT_APPBUILDTIME);

        const codePushFolder = fs.Folder.fromPath(fs.knownFolders.documents().path + "/CodePush");
        //noinspection JSIgnoredPromiseFromCall
        codePushFolder.clear();
    }

    private static saveCurrentPackage(pack: IPackage): void {
        appSettings.setString(TNSLocalPackage.CODEPUSH_CURRENT_PACKAGE, JSON.stringify(pack));
    }

    static getCurrentPackage(): IPackage {
        const packageStr: string = appSettings.getString(TNSLocalPackage.CODEPUSH_CURRENT_PACKAGE, null);
        return packageStr === null ? null : JSON.parse(packageStr);
    }

    static copyFolder(fromPath: string, toPath: string): boolean {
        if (isIOS) {
            return TNSCodePush.copyEntriesInFolderDestFolderError(fromPath, toPath);
        } else {
            try {
                com.tns.TNSCodePush.copyDirectoryContents(fromPath, toPath);
                return true;
            } catch (error) {
                console.log(`Copy error on Android: ${error}`);
                return false;
            }
        }
    }
}
