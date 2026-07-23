import { buildPhotoUrl, mapAuthorUser } from './author';

describe('author utils', () => {
  describe('buildPhotoUrl', () => {
    it('devuelve la URL parcial cuando hay foto', () => {
      expect(
        buildPhotoUrl({ id: 'prof-1', photo: '/uploads/photos/prof-1/x.png' }),
      ).toBe('/uploads/photo/prof-1');
    });

    it('devuelve null si no hay foto', () => {
      expect(buildPhotoUrl({ id: 'prof-1', photo: null })).toBeNull();
    });

    it('devuelve null si no hay profile', () => {
      expect(buildPhotoUrl(null)).toBeNull();
      expect(buildPhotoUrl(undefined)).toBeNull();
    });
  });

  describe('mapAuthorUser', () => {
    it('normaliza el autor con photoUrl y sin exponer la ruta cruda', () => {
      const result = mapAuthorUser({
        id: 'u-1',
        email: 'a@x.com',
        profile: { id: 'prof-1', name: 'Ana', photo: '/uploads/photos/prof-1/x.png' },
      });

      expect(result).toEqual({
        id: 'u-1',
        email: 'a@x.com',
        profile: { name: 'Ana' },
        photoUrl: '/uploads/photo/prof-1',
      });
    });

    it('photoUrl null cuando el perfil no tiene foto', () => {
      const result = mapAuthorUser({
        id: 'u-1',
        email: 'a@x.com',
        profile: { id: 'prof-1', name: 'Ana', photo: null },
      });

      expect(result).toMatchObject({ photoUrl: null, profile: { name: 'Ana' } });
    });

    it('preserva null/undefined', () => {
      expect(mapAuthorUser(null)).toBeNull();
    });
  });
});
