import {useEffect, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';
import * as THREE from 'three';

/** Loads textures before the frame renders. */
export const useTextures = (files: string[]) => {
  const [handle] = useState(() => delayRender(`textures ${files.length}`));
  const [tex, setTex] = useState<THREE.Texture[] | null>(null);
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    Promise.all(
      files.map(
        (fl) =>
          new Promise<THREE.Texture>((res, rej) =>
            loader.load(staticFile(fl), (t) => {
              t.colorSpace = THREE.SRGBColorSpace;
              t.anisotropy = 8;
              res(t);
            }, undefined, rej),
          ),
      ),
    )
      .then((t) => {
        setTex(t);
        continueRender(handle);
      })
      .catch((e) => {
        console.error(e);
        continueRender(handle);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return tex;
};

export const useText = (file: string) => {
  const [handle] = useState(() => delayRender(`text ${file}`));
  const [txt, setTxt] = useState<string | null>(null);
  useEffect(() => {
    fetch(staticFile(file))
      .then((r) => r.text())
      .then((t) => {
        setTxt(t);
        continueRender(handle);
      });
  }, [file, handle]);
  return txt;
};

export const PAGES = Array.from({length: 29}, (_, i) => `pdf/page-${String(i + 1).padStart(2, '0')}.png`);
