import { describe, expect, it } from 'vitest';
import { cleanPhoto, sniffImage, stripJpegMetadata, stripPngMetadata } from './photo';

const seg = (marker: number, payload: number[]) => [0xff, marker, (payload.length + 2) >> 8, (payload.length + 2) & 0xff, ...payload];
const text = (s: string) => [...s].map((c) => c.charCodeAt(0));

const GPS = text('Exif\0\0GPS 38.7223N 9.1393W');
const jpeg = new Uint8Array([
  0xff, 0xd8,
  ...seg(0xe0, text('JFIF\0')),
  ...seg(0xe1, GPS),
  ...seg(0xe2, text('ICC_PROFILE\0')),
  ...seg(0xe1, text('http://ns.adobe.com/xap/1.0/')),
  ...seg(0xfe, text('Rua A, 1')),
  ...seg(0xdb, [0, 1, 2]),
  0xff, 0xda, 0x00, 0x02, 0x11, 0x22, 0xff, 0xd9,
]);

const chunk = (type: string, data: number[]) => [0, 0, 0, data.length, ...text(type), ...data, 1, 2, 3, 4];
const png = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ...chunk('IHDR', [1, 2, 3]),
  ...chunk('tEXt', text('Author\0Nuno')),
  ...chunk('eXIf', GPS.slice(0, 10)),
  ...chunk('IDAT', [9, 9]),
  ...chunk('IEND', []),
]);

const contains = (hay: Uint8Array, needle: number[]) =>
  hay.some((_, i) => needle.every((b, j) => hay[i + j] === b));

describe('fotografias', () => {
  it('reconhece o tipo pelos bytes', () => {
    expect(sniffImage(jpeg)).toBe('image/jpeg');
    expect(sniffImage(png)).toBe('image/png');
    expect(sniffImage(new TextEncoder().encode('%PDF-1.7'))).toBeNull();
  });

  it('retira EXIF, XMP e comentários do JPEG e mantém a imagem e o perfil de cor', () => {
    const out = stripJpegMetadata(jpeg)!;
    expect(contains(out, text('GPS'))).toBe(false);
    expect(contains(out, text('adobe'))).toBe(false);
    expect(contains(out, text('Rua A'))).toBe(false);
    expect(contains(out, text('JFIF'))).toBe(true);
    expect(contains(out, text('ICC_PROFILE'))).toBe(true);
    expect([...out.slice(-6)]).toEqual([0x00, 0x02, 0x11, 0x22, 0xff, 0xd9]);
    expect(stripJpegMetadata(out)).toEqual(out);
  });

  it('retira texto e EXIF do PNG', () => {
    const out = stripPngMetadata(png)!;
    expect(contains(out, text('Nuno'))).toBe(false);
    expect(contains(out, text('eXIf'))).toBe(false);
    expect(contains(out, text('IDAT'))).toBe(true);
    expect(contains(out, text('IEND'))).toBe(true);
  });

  it('recusa ficheiros truncados ou de outro tipo', () => {
    expect(stripJpegMetadata(jpeg.slice(0, 12))).toBeNull();
    expect(stripPngMetadata(png.slice(0, 30))).toBeNull();
    expect(cleanPhoto(new TextEncoder().encode('%PDF-1.7'))).toEqual({ error: 'Só fotografias JPG ou PNG.' });
    expect(cleanPhoto(new Uint8Array())).toEqual({ error: 'Escolha uma fotografia.' });
  });
});
