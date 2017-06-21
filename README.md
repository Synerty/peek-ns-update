# Peek Nativescript App Updater

This plugin provides an incremental update for the peek-mobile NativeScript app.

> This code was forked from https://github.com/EddyVerbruggen/nativescript-code-push.

## How does it work?
Part of a NativeScript app is XML/HTML, CSS and JavaScript files and any
accompanying images.

This npm package provides the ability to update some of the nativescript app from the
peek-client server.

### What can be CodePushed?
- Anything inside your `/app` folder.
- Anything inside your `/node_modules` folder.

### What can't (and won't):
- NativeScript platform updates. Example: bumping `tns-android` from
version 2.5.1 to 2.5.2.
- Plugins updates that also require a different version of a native library it depends on.

So as long as you don't change versions of dependencies and tns platforms in
your `peek_mobile/build-ns/package.json` you can push happily. And if you do bump a
version of a dependency make sure there are no changed platform libraries.

## Testing CodePush packages during development
You may want to play with CodePush before using it in production (smart move!).
Perform these steps once you've pushed an update and added the `sync` command:

- `tns run [ios|android] --no-watch --clean`
- kill the app after the update is installed
- restart the app

> Note that (at least on Android) that `--no-watch` is really required as otherwise
LiveSync will mess with your test!


