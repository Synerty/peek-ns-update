import { EventEmitter } from "@angular/core";
import { ErrorCallback, ILocalPackage, InstallMode, InstallOptions, IPackage, SuccessCallback } from "./code-push-lib";
export declare class TNSLocalPackage implements ILocalPackage {
    private static CODEPUSH_CURRENT_APPVERSION;
    private static CODEPUSH_CURRENT_PACKAGE;
    private static CODEPUSH_CURRENT_APPBUILDTIME;
    private static CODEPUSH_APK_BUILD_TIME;
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
    install(installSuccess: SuccessCallback<InstallMode>, installError?: ErrorCallback, installOptions?: InstallOptions): void;
    installWithPromise(installProgressEvent: EventEmitter<null | number>, installOptions?: InstallOptions): Promise<InstallMode>;
    static unzip(archive: string, destination: string, installProgressEvent: EventEmitter<null | number>): Promise<void>;
    static clean(): void;
    private static saveCurrentPackage(pack);
    static getCurrentPackage(): IPackage;
    static copyFolder(fromPath: string, toPath: string): boolean;
}
