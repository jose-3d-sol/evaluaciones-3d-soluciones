import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const text = await file.text();
    const questions = JSON.parse(text);

    // Insertar preguntas en Supabase
    const { error } = await supabaseAdmin
      .from('preguntas')
      .insert(questions);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      count: questions.length,
      message: `${questions.length} preguntas cargadas`
    });
  } catch (error) {
    return NextResponse.json({ error: 'Error processing file' }, { status: 500 });
  }
}
