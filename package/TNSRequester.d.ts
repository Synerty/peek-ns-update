import { Http } from "./code-push-lib";
import Requester = Http.Requester;
import Verb = Http.Verb;
export declare class TNSRequester implements Requester {
    request(verb: Verb, url: string, requestBody?: string): Promise<Http.Response>;
    private static getHttpMethodName(verb);
}
