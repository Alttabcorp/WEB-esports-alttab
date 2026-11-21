import { describe, expect, it } from "vitest";
import type { ParticipantPerks } from "@/lib/riot/types";
import {
  buildRuneFingerprint,
  coreRuneFingerprint,
  extractRunes,
  parseRuneFingerprint,
} from "./runes";

const samplePerks: ParticipantPerks = {
  statPerks: { defense: 5002, flex: 5008, offense: 5005 },
  styles: [
    {
      description: "primaryStyle",
      style: 8000,
      selections: [
        { perk: 8005, var1: 0, var2: 0, var3: 0 },
        { perk: 9111, var1: 0, var2: 0, var3: 0 },
        { perk: 9104, var1: 0, var2: 0, var3: 0 },
        { perk: 8014, var1: 0, var2: 0, var3: 0 },
      ],
    },
    {
      description: "subStyle",
      style: 8100,
      selections: [
        { perk: 8139, var1: 0, var2: 0, var3: 0 },
        { perk: 8135, var1: 0, var2: 0, var3: 0 },
      ],
    },
  ],
};

describe("extractRunes", () => {
  it("extracts full primary and secondary page", () => {
    const result = extractRunes(samplePerks);
    expect(result.primaryStyle).toBe(8000);
    expect(result.subStyle).toBe(8100);
    expect(result.keystone).toBe(8005);
    expect(result.primaryPerkIds).toEqual([8005, 9111, 9104, 8014]);
    expect(result.subPerkIds).toEqual([8139, 8135]);
    expect(result.statPerkIds).toEqual([5005, 5008, 5002]);
    expect(result.perkIds).toEqual([8005, 9111, 9104, 8014, 8139, 8135]);
    expect(result.runeFingerprint).toBe(
      "8000:8005-9111-9104-8014|8100:8135-8139|5005-5008-5002",
    );
  });

  it("returns empty when perks missing", () => {
    expect(extractRunes(undefined)).toEqual({
      primaryStyle: null,
      subStyle: null,
      keystone: null,
      primaryPerkIds: [],
      subPerkIds: [],
      statPerkIds: [],
      perkIds: [],
      runeFingerprint: null,
    });
  });
});

describe("rune fingerprint", () => {
  it("builds and parses full page fingerprint", () => {
    const fp = buildRuneFingerprint({
      primaryStyle: 8000,
      subStyle: 8100,
      primaryPerkIds: [8005, 9111, 9104, 8014],
      subPerkIds: [8139, 8135],
      statPerkIds: [5005, 5008, 5002],
    });
    expect(fp).toBe(
      "8000:8005-9111-9104-8014|8100:8135-8139|5005-5008-5002",
    );
    expect(parseRuneFingerprint(fp)).toEqual({
      primaryStyle: 8000,
      keystone: 8005,
      subStyle: 8100,
      primaryPerkIds: [8005, 9111, 9104, 8014],
      subPerkIds: [8135, 8139],
      statPerkIds: [5005, 5008, 5002],
      perkIds: [8005, 9111, 9104, 8014, 8135, 8139],
    });
  });

  it("normaliza ordem das secundárias e ignora shards no core", () => {
    const a = buildRuneFingerprint({
      primaryStyle: 8000,
      subStyle: 8100,
      primaryPerkIds: [8005, 9111, 9104, 8014],
      subPerkIds: [8139, 8135],
      statPerkIds: [5005, 5008, 5002],
    });
    const b = buildRuneFingerprint({
      primaryStyle: 8000,
      subStyle: 8100,
      primaryPerkIds: [8005, 9111, 9104, 8014],
      subPerkIds: [8135, 8139],
      statPerkIds: [5008, 5008, 5002],
    });
    expect(coreRuneFingerprint(a)).toBe(coreRuneFingerprint(b));
    expect(coreRuneFingerprint(a)).toBe(
      "8000:8005-9111-9104-8014|8100:8135-8139",
    );
  });

  it("parses legacy fingerprint", () => {
    expect(parseRuneFingerprint("8000-8005-8100")).toEqual({
      primaryStyle: 8000,
      keystone: 8005,
      subStyle: 8100,
      primaryPerkIds: [8005],
      subPerkIds: [],
      statPerkIds: [],
      perkIds: [8005],
    });
  });

  it("returns null when incomplete", () => {
    expect(
      buildRuneFingerprint({
        primaryStyle: 8000,
        subStyle: null,
        primaryPerkIds: [8005],
        subPerkIds: [8139],
      }),
    ).toBeNull();
    expect(parseRuneFingerprint("empty")).toBeNull();
  });
});
