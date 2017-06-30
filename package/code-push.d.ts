import { SyncOptions, SyncStatus } from "./code-push-lib";
export declare class CodePush {
    static CURRENT_HASH_KEY: string;
    private static PENDING_HASH_KEY;
    private static CLEAN_KEY;
    private static BINARY_FIRST_RUN_KEY;
    private static UNCONFIRMED_INSTALL_KEY;
    private static syncInProgress;
    downloadProgressEvent: any;
    installProgressEvent: any;
    syncStatusEvent: any;
    private remotePackage;
    private localPackage;
    sync(options: SyncOptions): Promise<SyncStatus>;
    private checkForUpdate(deploymentKey);
    private getCurrentPackage(config);
    private cleanPackagesIfNeeded();
    private notifyApplicationReady(deploymentKey);
    private static isBinaryFirstRun();
    private static hasPendingHash();
    private static markBinaryAsFirstRun();
    private static firstLaunchValue();
    private static markPackageAsFirstRun(pack);
}
