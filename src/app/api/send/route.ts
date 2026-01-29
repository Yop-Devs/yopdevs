import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { name, email, message } = await request.json();

    const data = await resend.emails.send({
from: 'YOP DEVS <contato@yopdevs.com.br>',
      to: ['gabrielqsiqueira6@gmail.com'], // Seu e-mail de destino
      subject: `Novo Chamado: ${name}`,
      html: `<p><strong>Nome:</strong> ${name}</p>
             <p><strong>E-mail:</strong> ${email}</p>
             <p><strong>Mensagem:</strong> ${message}</p>`,
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error });
  }
}