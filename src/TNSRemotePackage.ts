import * as http from "http";
import * as fs from "file-system";
import {TNSLocalPackage} from "./TNSLocalPackage";
import {TNSAcquisitionManager} from "./TNSAcquisitionManager";
import {EventEmitter} from "@angular/core";
import {DownloadProgress, ILocalPackage} from "./code-push-lib";

export class TNSRemotePackage implements IRemotePackage {
    downloadUrl: string;
    deploymentKey: string;
    description: string;
    label: string;
    appVersion: string;
    isMandatory: boolean;
    packageHash: string;
    packageSize: number;
    failedInstall: boolean;

    download(downloadProgressEvent: EventEmitter<null | DownloadProgress>): Promise<ILocalPackage> {
        return http.getFile(this.downloadUrl)
            .then((file: fs.File) => {
                let tnsLocalPackage: ILocalPackage = new TNSLocalPackage();
                tnsLocalPackage.localPath = file.path;
                tnsLocalPackage.deploymentKey = this.deploymentKey;
                tnsLocalPackage.description = this.description;
                tnsLocalPackage.label = this.label;
                tnsLocalPackage.appVersion = this.appVersion;
                tnsLocalPackage.isMandatory = this.isMandatory;
                tnsLocalPackage.packageHash = this.packageHash;
                tnsLocalPackage.isFirstRun = false;

                return tnsLocalPackage;
            })
            .catch((e: any) => {
                downloadProgressEvent.emit(null);
                throw new Error("Could not access local package. " + e);
            });
    }

}
