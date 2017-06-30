import { IPackage, IRemotePackage, NativeUpdateNotification } from "./code-push-lib";
export declare class TNSAcquisitionManager {
    constructor(deploymentKey: string);
    queryUpdateWithCurrentPackage(currentPackage: IPackage): Promise<IRemotePackage | NativeUpdateNotification>;
    reportStatusDeploy(pkg?: IPackage, status?: string, previousLabelOrAppVersion?: string, previousDeploymentKey?: string): void;
    reportStatusDownload(pkg: IPackage): void;
}
