import {Component, OnInit} from "@angular/core";

import {Item} from "./item";
import {ItemService} from "./item.service";

import {Ng2BalloonMsgService} from "@synerty/ng2-balloon-msg";
import {DeviceUpdateTuple} from "./tuples/DeviceUpdateTuple";
import {DeviceServerService} from "./device-server.service";
import {DeviceUpdateServiceDelegate} from "./DeviceUpdateServiceDelegate";

@Component({
    selector: "ns-items",
    moduleId: module.id,
    templateUrl: "./items.component.html",
})
export class ItemsComponent implements OnInit {
    items: Item[];

    private balloonMsg = new Ng2BalloonMsgService();
    private deviceServerService = new DeviceServerService();

    private update: DeviceUpdateServiceDelegate = null;

    private updateInfo: DeviceUpdateTuple = new DeviceUpdateTuple();

    constructor(private itemService: ItemService) {
        this.update = new DeviceUpdateServiceDelegate(
            this.deviceServerService,
            this.balloonMsg
        );

        this.updateInfo.appVersion = "x.x.x";

        // this.updateInfo.id: number;
        // this.updateInfo.deviceType: string;
        // this.updateInfo.description: string;
        // this.updateInfo.buildDate: Date;
        // this.updateInfo.appVersion: string;
        // this.updateInfo.updateVersion: string;
        // this.updateInfo.filePath: string;
        this.updateInfo.urlPath = 'mobile-ios/1.1.2.zip';
        // this.updateInfo.fileSize: number;
        // this.updateInfo.isEnabled: boolean;

    }

    ngOnInit(): void {
        this.items = this.itemService.getItems();
    }
}