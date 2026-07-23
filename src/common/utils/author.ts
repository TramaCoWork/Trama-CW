/**
 * Construye la URL parcial (relativa) de la foto de perfil.
 * El front/app le antepone el dominio. Devuelve null si el perfil no tiene foto.
 * La ruta publica que sirve la imagen es GET /uploads/photo/:profileId.
 */
export function buildPhotoUrl(
  profile?: { id: string; photo: string | null } | null,
): string | null {
  return profile?.photo ? `/uploads/photo/${profile.id}` : null;
}

type AuthorUserInput = {
  id: string;
  email: string;
  profile?: { id: string; name: string; photo: string | null } | null;
} | null;

/**
 * Normaliza el autor anidado (shape community: user.profile.name) agregando
 * photoUrl y sin exponer la ruta cruda de almacenamiento (profile.photo).
 */
export function mapAuthorUser(user: AuthorUserInput) {
  if (!user) {
    return user;
  }

  return {
    id: user.id,
    email: user.email,
    profile: user.profile ? { name: user.profile.name } : null,
    photoUrl: buildPhotoUrl(user.profile),
  };
}
