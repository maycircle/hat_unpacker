# hat_unpacker
Decrypts **Duck Game** files of `.hat` extension, unpacks/exports hat image from them.

## How to use
Before using **hat_unpacker** you must have installed TypeScript package on your machine. Also,
don't forget to install all dependencies (`@types/node`):
```shell
npm install
```
### Unpack/export everything from "./packed" folder
```shell
npm run unpack
```
### Unpack/export everything from separated folder (relative or absolute path)
```shell
npm run unpack C:/DuckGame
```
### Unpack/export single file
Relative path example. Unpacks/exports single file from "./packed" folder.
```shell
npm run unpack my_hat.hat
```
Absolute path example.
```shell
npm run unpack C:/DuckGame/my_hat.hat
```
