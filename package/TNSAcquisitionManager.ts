import { device } from "platform";
import * as AppVersion from "nativescript-appversion";
import { TNSRequester } from "./TNSRequester";
import {
  Configuration, IPackage, IRemotePackage,
  NativeUpdateNotification
} from "./code-push-lib";

export class TNSAcquisitionManager {

  // private codePushSDK: AcquisitionManager;

  constructor(deploymentKey: string) {
    const config: Configuration = {
      serverUrl: "https://codepush.azurewebsites.net/",
      appVersion: AppVersion.getVersionNameSync(),
      clientUniqueId: device.uuid,
      deploymentKey: deploymentKey
    };
    // this.codePushSDK = new CodePushSDK(new TNSRequester(), config);
    return this;
  }

  queryUpdateWithCurrentPackage(currentPackage: IPackage) : Promise<IRemotePackage | NativeUpdateNotification> {
      console.log("TODO, Implement: queryUpdateWithCurrentPackage");
    // this.codePushSDK.queryUpdateWithCurrentPackage(currentPackage, callback);
    return Promise.reject("queryUpdateWithCurrentPackage not implemented");

  }

  reportStatusDeploy(pkg?: IPackage, status?: string, previousLabelOrAppVersion?: string, previousDeploymentKey?: string): void {
      console.log("TODO, Implement: reportStatusDeploy");
    // this.codePushSDK.reportStatusDeploy(pkg, status, previousLabelOrAppVersion, previousDeploymentKey, () => {
      // console.log("---- reportStatusDeploy completed, status: " + status);
      // console.log("---- reportStatusDeploy completed, pkg: " + JSON.stringify(pkg));
      // console.log("---- reportStatusDeploy completed, previousLabelOrAppVersion: " + previousLabelOrAppVersion);
      // console.log("---- reportStatusDeploy completed, previousDeploymentKey: " + previousDeploymentKey);
    // });
  }

  reportStatusDownload(pkg: IPackage): void {
      console.log("TODO, Implement: reportStatusDownload");
    // this.codePushSDK.reportStatusDownload(pkg, () => {
      console.log("---- reportStatusDownload completed");
    // });
  }
}