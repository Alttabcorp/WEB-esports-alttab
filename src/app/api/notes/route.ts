import { NextRequest, NextResponse } from "next/server";
import { getCoachNotes, upsertCoachNotes } from "@/lib/db/persist";

export async function GET() {
  try {
    const notes = await getCoachNotes();
    if (!notes) {
      return NextResponse.json(
        { error: "Configure o perfil antes de usar notas" },
        { status: 400 },
      );
    }
    return NextResponse.json({ notes });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Falha ao carregar notas" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      dailyNote?: string;
      generalNote?: string;
    };

    if (body.dailyNote === undefined && body.generalNote === undefined) {
      return NextResponse.json(
        { error: "Informe dailyNote e/ou generalNote" },
        { status: 400 },
      );
    }

    const notes = await upsertCoachNotes({
      ...(body.dailyNote !== undefined ? { dailyNote: body.dailyNote } : {}),
      ...(body.generalNote !== undefined
        ? { generalNote: body.generalNote }
        : {}),
    });

    return NextResponse.json({ notes });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao salvar notas";
    const status = message.includes("Configure o perfil") ? 400 : 500;
    console.error(error);
    return NextResponse.json({ error: message }, { status });
  }
}
