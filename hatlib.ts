import { readFileSync, writeFileSync } from "fs";
import { decrypt } from "./aes";

import { extname } from "path";

// WARNING: keys should remain the same

/** AES key for base section decryption. */
export const HAT_AES_BASE_KEY = Buffer.from("f316982001f47a6f612a0d02130f2de6", "hex");
/** AES key for image decryption.
 * @deprecated Never used since new update (?).
 */
export const HAT_AES_MAGIC_KEY = Buffer.from("dd550H5uAQA=");

/** Encrypted hat type. */
export enum HatType {
    /** Hats of simple type are very rare/outdated. */
    Simple = 1,
    Complex
}

/** Decrypted hat information. */
export interface DecryptedHat {
    teamName: string;
    imageSize: number;
    imageBytes: Buffer;
}

/**
 * Export image from decrypted hat.
 * @param filename Absolute or relative export path.
 * @param decryptedHat Decrypted hat.
 */
export function exportDecryptedHat(filename: string, decryptedHat: DecryptedHat) {
    writeFileSync(filename, decryptedHat.imageBytes);
}

function exportHatBase(filename: string, hatBase: Buffer) {
    writeFileSync(filename, hatBase);
}

/** Minimum implementation for Duck Game's hats. */
export class HatDecryptor {
    protected data: Buffer;

    protected offset: number;

    /**
     * @param data Encrypted `.hat` data.
     * @param offset Reading position offset.
     */
    constructor(data: Buffer, offset: number = 0) {
        this.data = data;
        this.offset = offset;
    }

    /**
     * Create HatDecryptor instance using file.
     * @param filename Absolute or relative path to file.
     */
    static fromFile(filename: string): HatDecryptor {
        if (extname(filename) != ".hat") throw new Error("hatlib: wrong file format.");
        return new HatDecryptor(readFileSync(filename));
    }

    /** Automatically determine necessary hat decryptor and then decrypt it. */
    public decrypt(): DecryptedHat {
        if (this.type() == HatType.Simple) return new SimpleHatDecryptor(this.data).decrypt();
        else return new ComplexHatDecryptor(this.data).decrypt();
    }

    /** Get encrypted hat type. */
    public type(): HatType {
        if (this.data.readBigInt64LE() == BigInt(630430777029345)) return HatType.Simple;
        else return HatType.Complex;
    }

    /**
     * Get initialization vector (generally) of hat of complex type (can be applied to hat of
     * simple type).
     */
    public iv(): Buffer {
        // key length == iv length (16)
        return this.data.slice(4, this.data.readInt32LE() + 4);
    }
}

declare global {
    interface Buffer {
        readSizedString(offset?: number): string;
    }
}

Buffer.prototype.readSizedString = function(offset?: number): string {
    let length = this.readInt8(offset);
    return this.slice(offset + 1, offset + length + 1).toString();
}

export class SimpleHatDecryptor extends HatDecryptor {
    /** Detach hat image section of simple type. */
    public decrypt(): DecryptedHat {
        this.offset += 8;

        let teamName = this.data.readSizedString(this.offset);
        this.offset += Buffer.byteLength(teamName, "utf8") + 1;
        // Practically hat of simple type doesn't have image size encrtyped in it
        let imageSize = this.data.readInt32LE(this.offset);
        this.offset += 4;

        return { teamName, imageSize, imageBytes: this.data.slice(this.offset,
            this.offset + imageSize) };
    }
}

/**
 * Decrypts `.hat` base section.
 * @param cipherIn Array of bytes.
 * @param iv Initialization Vector.
 */
export function hatBaseDecryptor(cipherIn: Buffer | number[] | string, iv: Buffer | number[]) {
    return decrypt(cipherIn, 2, HAT_AES_BASE_KEY, iv);
}

function hatBaseKey(decryptedBase: Buffer) {
    let baseKey = decryptedBase.readBigInt64LE();
    if (baseKey == BigInt(402965919293045) || baseKey == BigInt(630430777029345))
        return { isValid: true, baseKey: baseKey, isSpecific: false };
    else if (baseKey == BigInt(630449177029345) || baseKey == BigInt(465665919293045))
        return { isValid: true, baseKey: baseKey, isSpecific: true };
    else return { isValid: false, baseKey: null, isSpecific: false };
}

export class ComplexHatDecryptor extends HatDecryptor {
    /**
     * Decrypt hat file base section of complex type.
     * @returns Decrypted hat file base section.
     */
    public decryptBase(): Buffer {
        if (this.type() == HatType.Complex) {
            let iv = this.iv();
            return Buffer.from(hatBaseDecryptor(this.data.slice(iv.length + 4), iv));
        }
    }

    /** Decrypt hat base section of complex type and represent it as DecryptedHat. */
    public decrypt(): DecryptedHat {
        let base = this.decryptBase();

        let baseKey = hatBaseKey(base);
        if (!baseKey.isValid) throw new Error("hatlib: corrupted base section of hat file.");
        if (baseKey.isSpecific) this.offset += base.readSizedString(this.offset).length + 1;
        
        return new SimpleHatDecryptor(base, this.offset).decrypt();
    }
}
