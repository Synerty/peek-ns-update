import {Injectable} from "@angular/core";
import {Ng2BalloonMsgService} from "@synerty/ng2-balloon-msg";
import {DeviceUpdateTuple} from "./tuples/DeviceUpdateTuple";

import * as http from "http";
import {DeviceServerService} from "./device-server.service";
import * as fs from "file-system";
// import * as fsa from "file-system/file-system-access";
// import * as appSettings from "application-settings";
import {isIOS} from "platform";
// import * as utils from "utils/utils";


// import * as BackgroundTask from "nativescript-background-task";
let BackgroundTask = require("nativescript-background-task");

// TODO, Code to download the update

// Download : `/peek_core_device/device_update/${deviceUpdate.filePath}
// Unzip
// Move
// Restart

let logPre = "peek_core_device.Update";

@Injectable()
export class DeviceUpdateServiceDelegate {
    private isUpdating = false;

    // ------------------------------------------------------------------------


    private CURRENT_HASH_KEY: string = "CURRENT_HASH_KEY";

    // this is the app version at the moment the CodePush package was installed
    private CODEPUSH_CURRENT_APPVERSION: string = "CODEPUSH_CURRENT_APPVERSION"; // same as native

    // this is the build timestamp of the app at the moment the CodePush package was installed
    private CODEPUSH_CURRENT_APPBUILDTIME: string = "CODEPUSH_CURRENT_APPBUILDTIME"; // same as native
    private CODEPUSH_APK_BUILD_TIME: string = "CODE_PUSH_APK_BUILD_TIME"; // same as include.gradle

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

    // --------------------------------------------------------------------------

    constructor(private serverService: DeviceServerService,
                private balloonMsg: Ng2BalloonMsgService) {
    }

    get updateInProgress(): boolean {
        return this.isUpdating;
    }

    updateTo(deviceUpdate: DeviceUpdateTuple): Promise<void> {
        this.isUpdating = true;

        // Generate a path like <documents.path>/myFiles/test.txt
        let destFilePath = fs.path.join(fs.knownFolders.temp().path, "update.zip");
        let extractToPath = fs.path.join(fs.knownFolders.documents().path, "CodePush", "pending");
        // let destFile = fs.knownFolders.documents().getFile("update.zip");

        // in case of a rollback 'newPackageFolderPath' could already exist, so check and remove
        if (fs.Folder.exists(destFilePath)) {
            fs.Folder.fromPath(destFilePath).removeSync();
        }

        return this.download(deviceUpdate, destFilePath)
            .then(() => {
                return this.unzip(deviceUpdate, destFilePath, extractToPath);
            // })
            // .then(() => {
            // this.setupNative(deviceUpdate);
            });

    }

    private download(deviceUpdate: DeviceUpdateTuple, destFilePath: String): Promise<void> {

        let prot = this.serverService.serverUseSsl ? "https" : "http";
        let host = this.serverService.serverHost;
        let httpPort = this.serverService.serverHttpPort;
        let path = deviceUpdate.urlPath;
        let url = `${prot}://${host}:${httpPort}/peek_core_device/device_update/${path}`;


        return new Promise<void>((resolve, reject) => {
            BackgroundTask.getFile({
                url: url,
                toFile: destFilePath,
                identifier: 1,
                partBytesSize: 0, // use default 2MB
                checkPartialDownload: false,
                headers: [
                    {'CustomHeader': 'Custom Value'}
                ],
                doneCallback: (identifier) => {
                    console.log(`${logPre} Download complete`);
                    resolve();
                },
                errorCallback: (error) => {
                    let identifier = error[0];
                    let message = error[1];
                    // error
                    reject(message);
                },
            })


        });


    }


    private  unzip(deviceUpdate: DeviceUpdateTuple,
                   downloadedFilePath: string,
                   extractToPath: string): Promise<void> {


        if (fs.Folder.exists(extractToPath)) {
            console.log(`${logPre} Unzip destination exists, deleting`);
            fs.Folder.fromPath(extractToPath).removeSync();
        }

        if (!fs.File.exists(downloadedFilePath)) {
            console.log('Zip file does not exists...');
            this.balloonMsg.showError('Zip file does not exists.. do zip download.');
            return;
        }

        console.log(`${logPre} Unzipping to ${extractToPath}`);

        return new Promise<void>((resolve, reject) => {
            BackgroundTask.unzip({
                fromFile: downloadedFilePath,
                toFile: extractToPath,
                doneCallback: () => {
                    console.log(`${logPre} Unzip complete`);

                    fs.Folder.fromPath(extractToPath).getEntities()
                        .then((entities) => {
                            for (let e of entities) {
                                console.log(e.name);
                            }
                            console.log("Unzipped " + entities.length + " files to " + extractToPath);
                        })
                        .catch((error) => {
                            console.log('Error on list directory ' + extractToPath + ': ' + error);
                        });

                    resolve();

                },
                errorCallback: (error) => {
                    let msg = `Unzip failed: ${error}`;
                    console.log(`${logPre} ${msg}`);

                    this.balloonMsg.showError(msg);
                    reject(msg);

                },
            });
        });

    }
/*
    private
    setupNative(deviceUpdate: DeviceUpdateTuple): void {
        const previousHash = appSettings.getString(this.CURRENT_HASH_KEY, null);


        appSettings.setString(this.CODEPUSH_CURRENT_APPVERSION, deviceUpdate.appVersion);

        let buildTime: string;
        // Note that this 'if' hardly justifies subclassing so we're not
        if (isIOS) {
            const plist = utils.ios.getter(NSBundle, NSBundle.mainBundle).pathForResourceOfType(null, "plist");
            const fileDate = new fsa.FileSystemAccess().getLastModified(plist);
            buildTime = "" + fileDate.getTime();
        } else {
            const codePushApkBuildTimeStringId = utils.ad.resources.getStringId(this.CODEPUSH_APK_BUILD_TIME);
            buildTime = utils.ad.getApplicationContext().getResources().getString(codePushApkBuildTimeStringId);
        }
        appSettings.setString(this.CODEPUSH_CURRENT_APPBUILDTIME, buildTime);

    }


    private
    clean(): void {
        // note that we mustn't call this on Android, but it can't hurt to guard that
        if (!isIOS) {
            return;
        }

        appSettings.remove(this.CODEPUSH_CURRENT_APPVERSION);
        appSettings.remove(this.CODEPUSH_CURRENT_APPBUILDTIME);

        fs.Folder.fromPath(fs.knownFolders.documents().path + "/CodePush").clear();
    }

*/



}
