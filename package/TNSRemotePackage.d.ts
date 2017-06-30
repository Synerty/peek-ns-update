import { EventEmitter } from "@angular/core";
import { DownloadProgress, ILocalPackage, IRemotePackage } from "./code-push-lib";
export declare class TNSRemotePackage implements IRemotePackage {
    downloadUrl: string;
    deploymentKey: string;
    description: string;
    label: string;
    appVersion: string;
    isMandatory: boolean;
    packageHash: string;
    packageSize: number;
    failedInstall: boolean;
    download(downloadProgressEvent: EventEmitter<null | DownloadProgress>): Promise<ILocalPackage>;
}
