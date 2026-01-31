ÍCONE DO APP (icone.png) — SEM FUNDO BRANCO
============================================
Para o ícone na tela inicial mostrar só a marca (sem o quadrado branco):

1. Edite o ícone em um programa de imagem (Figma, Photoshop, GIMP, Photopea, etc.):
   - Opção A: Apague o fundo branco e deixe TRANSPARENTE.
   - Opção B: Estenda o fundo escuro da marca até as bordas (512x512), sem moldura branca.

2. Exporte em PNG, 512x512 px.

3. Substitua o arquivo:  public/icone.png

4. O app já usa background_color escuro (#1e1b4b) no manifest; com ícone transparente,
   a área ao redor ficará roxa escura, sem branco.

Recomendado: fundo transparente ou cor sólida #1e1b4b até as bordas.
