export class DeviceServerService {


    constructor() {

    }

    get serverHost(): string {
        return "10.2.56.17";
    }

    get serverUseSsl(): boolean {
        return false;
    }

    get serverHttpPort(): number {
        return 8000;
    }

    get serverWebsocketPort(): number {
        return 8001;
    }


}