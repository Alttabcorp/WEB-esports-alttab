import { NextRequest, NextResponse } from "next/server";
import {
  createSavedBuild,
  deleteSavedBuild,
  getAppProfile,
  listSavedBuilds,
  updateSavedBuild,
} from "@/lib/db/persist";
import { ROLE_LABELS, type RoleKey } from "@/lib/stats/roles";

const VALID_ROLES: RoleKey[] = [
  "TOP",
  "JUNGLE",
  "MIDDLE",
  "BOTTOM",
  "UTILITY",
  "UNKNOWN",
];

export async function GET(request: NextRequest) {
  try {
    const profile = await getAppProfile();
    if (!profile) {
      return NextResponse.json(
        { error: "Configure seu perfil antes de gerenciar builds" },
        { status: 400 },
      );
    }
    const championIdRaw = request.nextUrl.searchParams.get("championId");
    const championId =
      championIdRaw != null && championIdRaw !== ""
        ? Number(championIdRaw)
        : undefined;
    const builds = await listSavedBuilds({
      championId:
        championId != null && Number.isFinite(championId) && championId > 0
          ? championId
          : undefined,
    });
    return NextResponse.json({ builds });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Falha ao listar builds" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getAppProfile();
    if (!profile) {
      return NextResponse.json(
        { error: "Configure seu perfil antes de salvar builds" },
        { status: 400 },
      );
    }

    const body = (await request.json()) as {
      championId?: number;
      championName?: string;
      name?: string;
      role?: string;
      items?: number[];
      enemyChampionId?: number | null;
      enemyChampionName?: string | null;
      isDefault?: boolean;
      notes?: string | null;
    };

    const championId = Number(body.championId);
    const items = Array.isArray(body.items)
      ? body.items.map(Number).filter((id) => id > 0)
      : [];
    const role = (body.role ?? "UNKNOWN").toUpperCase();

    if (!Number.isFinite(championId) || championId <= 0) {
      return NextResponse.json({ error: "Campeão inválido" }, { status: 400 });
    }
    if (!body.championName?.trim()) {
      return NextResponse.json(
        { error: "Nome do campeão obrigatório" },
        { status: 400 },
      );
    }
    if (items.length < 1) {
      return NextResponse.json(
        { error: "Adicione ao menos 1 item" },
        { status: 400 },
      );
    }
    if (!VALID_ROLES.includes(role as RoleKey)) {
      return NextResponse.json(
        { error: `Lane inválida. Use: ${Object.values(ROLE_LABELS).join(", ")}` },
        { status: 400 },
      );
    }

    const build = await createSavedBuild({
      championId,
      championName: body.championName.trim(),
      name: body.name?.trim() || "Build",
      role,
      items,
      enemyChampionId:
        body.enemyChampionId != null && Number(body.enemyChampionId) > 0
          ? Number(body.enemyChampionId)
          : null,
      enemyChampionName: body.enemyChampionName?.trim() || null,
      isDefault: Boolean(body.isDefault),
      notes: body.notes ?? null,
    });

    const builds = await listSavedBuilds({ championId });
    return NextResponse.json({ build, builds });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Falha ao criar build";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const profile = await getAppProfile();
    if (!profile) {
      return NextResponse.json(
        { error: "Configure seu perfil antes de editar builds" },
        { status: 400 },
      );
    }

    const body = (await request.json()) as {
      id?: string;
      name?: string;
      role?: string;
      items?: number[];
      enemyChampionId?: number | null;
      enemyChampionName?: string | null;
      isDefault?: boolean;
      notes?: string | null;
    };

    if (!body.id?.trim()) {
      return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    }

    if (body.role != null) {
      const role = body.role.toUpperCase();
      if (!VALID_ROLES.includes(role as RoleKey)) {
        return NextResponse.json({ error: "Lane inválida" }, { status: 400 });
      }
      body.role = role;
    }

    const build = await updateSavedBuild(body.id.trim(), {
      name: body.name,
      role: body.role,
      items: body.items,
      enemyChampionId: body.enemyChampionId,
      enemyChampionName: body.enemyChampionName,
      isDefault: body.isDefault,
      notes: body.notes,
    });

    const builds = await listSavedBuilds({ championId: build.championId });
    return NextResponse.json({ build, builds });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Falha ao atualizar build";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const profile = await getAppProfile();
    if (!profile) {
      return NextResponse.json(
        { error: "Configure seu perfil antes de remover builds" },
        { status: 400 },
      );
    }

    const id = request.nextUrl.searchParams.get("id")?.trim();
    if (!id) {
      return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    }

    const existing = (await listSavedBuilds()).find((b) => b.id === id);
    await deleteSavedBuild(id);
    const builds = existing
      ? await listSavedBuilds({ championId: existing.championId })
      : await listSavedBuilds();
    return NextResponse.json({ ok: true, builds });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Falha ao remover build" },
      { status: 500 },
    );
  }
}
