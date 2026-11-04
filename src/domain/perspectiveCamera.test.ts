import { describe, expect, it } from 'vitest';
import { baseDaCamera, projetarPonto, projetarVolume, CAMERA_OMISSAO, type ParametrosCamera } from './perspectiveCamera';
import type { VolumeInput } from './volume';

const dimensoesImagem = { largura: 1500, altura: 2000 };

describe('baseDaCamera / projetarPonto', () => {
  it('um ponto exatamente no alvo projeta-se no centro da imagem', () => {
    const camera: ParametrosCamera = { distanciaM: 10, alturaOlhoM: 1.6, azimuteGraus: 0, fovVerticalGraus: 65 };
    const alvo: [number, number, number] = [0, 0, 1.6];
    const base = baseDaCamera(camera, alvo, { cx: 0, cy: 0 });
    const [x, y] = projetarPonto(alvo, base, camera.fovVerticalGraus, dimensoesImagem)!;
    expect(x).toBeCloseTo(dimensoesImagem.largura / 2, 6);
    expect(y).toBeCloseTo(dimensoesImagem.altura / 2, 6);
  });

  it('um ponto à direita do alvo (mesma altura e profundidade) projeta-se à direita do centro', () => {
    const camera: ParametrosCamera = { distanciaM: 10, alturaOlhoM: 1.6, azimuteGraus: 0, fovVerticalGraus: 65 };
    const alvo: [number, number, number] = [0, 0, 1.6];
    const base = baseDaCamera(camera, alvo, { cx: 0, cy: 0 });
    const ponto: [number, number, number] = [2, 0, 1.6]; // 2m à direita do alvo, câmara de frente (azimute 0)
    const [x] = projetarPonto(ponto, base, camera.fovVerticalGraus, dimensoesImagem)!;
    expect(x).toBeGreaterThan(dimensoesImagem.largura / 2);
  });

  it('um ponto mais alto do que o alvo projeta-se mais acima no ecrã (y de pixel menor)', () => {
    const camera: ParametrosCamera = { distanciaM: 10, alturaOlhoM: 1.6, azimuteGraus: 0, fovVerticalGraus: 65 };
    const alvo: [number, number, number] = [0, 0, 1.6];
    const base = baseDaCamera(camera, alvo, { cx: 0, cy: 0 });
    const ponto: [number, number, number] = [0, 0, 3]; // mais alto, mesma linha de vista horizontal
    const [, y] = projetarPonto(ponto, base, camera.fovVerticalGraus, dimensoesImagem)!;
    expect(y).toBeLessThan(dimensoesImagem.altura / 2);
  });

  it('um campo de visão maior faz o mesmo ponto parecer mais perto do centro (menos ampliado)', () => {
    const alvo: [number, number, number] = [0, 0, 1.6];
    const ponto: [number, number, number] = [2, 0, 1.6];
    const estreito: ParametrosCamera = { distanciaM: 10, alturaOlhoM: 1.6, azimuteGraus: 0, fovVerticalGraus: 30 };
    const largo: ParametrosCamera = { distanciaM: 10, alturaOlhoM: 1.6, azimuteGraus: 0, fovVerticalGraus: 90 };
    const baseEstreito = baseDaCamera(estreito, alvo, { cx: 0, cy: 0 });
    const baseLargo = baseDaCamera(largo, alvo, { cx: 0, cy: 0 });
    const [xEstreito] = projetarPonto(ponto, baseEstreito, estreito.fovVerticalGraus, dimensoesImagem)!;
    const [xLargo] = projetarPonto(ponto, baseLargo, largo.fovVerticalGraus, dimensoesImagem)!;
    const centro = dimensoesImagem.largura / 2;
    expect(xLargo - centro).toBeLessThan(xEstreito - centro);
  });

  it('um ponto atrás da câmara não se projeta (null)', () => {
    const camera: ParametrosCamera = { distanciaM: 10, alturaOlhoM: 1.6, azimuteGraus: 0, fovVerticalGraus: 65 };
    const alvo: [number, number, number] = [0, 0, 1.6];
    const base = baseDaCamera(camera, alvo, { cx: 0, cy: 0 });
    // A câmara está em y = +10 (distância 10, azimute 0) a olhar para y=0: um ponto em y=+20 fica atrás dela.
    const pontoAtras: [number, number, number] = [0, 20, 1.6];
    expect(projetarPonto(pontoAtras, base, camera.fovVerticalGraus, dimensoesImagem)).toBeNull();
  });
});

describe('projetarVolume', () => {
  const input: VolumeInput = {
    pisos: 4,
    fachadas: 4,
    temVarandas: false,
    moradia: false,
    forma: 'quadrado',
    escala: { larguraM: 10, profundidadeM: 10, peDireitoM: 3 },
  };

  it('devolve faces com pontos dentro (ou perto) da imagem para uma câmara razoável de frente', () => {
    const faces = projetarVolume(input, CAMERA_OMISSAO, dimensoesImagem);
    expect(faces.length).toBeGreaterThan(0);
    const frente = faces.find((f) => f.kind === 'frente');
    expect(frente).toBeTruthy();
    // Os pontos da fachada da frente devem estar razoavelmente perto da zona visível da imagem.
    for (const [x, y] of frente!.points) {
      expect(x).toBeGreaterThan(-dimensoesImagem.largura);
      expect(x).toBeLessThan(dimensoesImagem.largura * 2);
      expect(y).toBeGreaterThan(-dimensoesImagem.altura);
      expect(y).toBeLessThan(dimensoesImagem.altura * 2);
    }
  });

  it('afastar a câmara (maior distância) encolhe o prédio projetado', () => {
    const perto = projetarVolume(input, { ...CAMERA_OMISSAO, distanciaM: 8 }, dimensoesImagem);
    const longe = projetarVolume(input, { ...CAMERA_OMISSAO, distanciaM: 30 }, dimensoesImagem);
    const larguraDaFace = (faces: ReturnType<typeof projetarVolume>) => {
      const frente = faces.find((f) => f.kind === 'frente')!;
      const xs = frente.points.map((p) => p[0]);
      return Math.max(...xs) - Math.min(...xs);
    };
    expect(larguraDaFace(longe)).toBeLessThan(larguraDaFace(perto));
  });

  it('sem imports de cliente de base de dados', async () => {
    const fonte = await import('fs/promises').then((fs) => fs.readFile(new URL('./perspectiveCamera.ts', import.meta.url), 'utf8'));
    expect(fonte).not.toMatch(/supabase/i);
  });
});
