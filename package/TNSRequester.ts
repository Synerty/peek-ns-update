import * as http from "http";
import {Http} from "./code-push-lib";
import Requester = Http.Requester;
import Verb = Http.Verb;
const packageJson = require("./package.json");

export class TNSRequester implements Requester {
    request(verb: Verb, url: string, requestBody?: string): Promise<Http.Response> {

        if (requestBody && typeof requestBody === "object") {
            requestBody = JSON.stringify(requestBody);
        }

        return http.request({
            method: TNSRequester.getHttpMethodName(verb),
            url: url,
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "X-CodePush-Plugin-Name": packageJson.name,
                "X-CodePush-Plugin-Version": packageJson.version,
                "X-CodePush-SDK-Version": packageJson.dependencies["code-push"]
            }
        }).then((response: http.HttpResponse) => {
            // Convert the response into the Http.Response (This packages definition)
            return {
                statusCode: response.statusCode,
                body: response.content ? response.content.toString() : null
            };
        });
    }

    private static getHttpMethodName(verb): string {
        // This should stay in sync with the enum at
        // https://github.com/Microsoft/code-push/blob/master/sdk/script/acquisition-sdk.ts#L6
        return [
            "GET",
            "HEAD",
            "POST",
            "PUT",
            "DELETE",
            "TRACE",
            "OPTIONS",
            "CONNECT",
            "PATCH"
        ][verb];
    }
}