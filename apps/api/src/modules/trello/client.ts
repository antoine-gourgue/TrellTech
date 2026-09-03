import { env, trelloConfigured } from '../../env.js';
import { HttpError } from '../../lib/errors.js';

const BASE_URL = 'https://api.trello.com/1';

export interface TrelloMember {
  id: string;
  username: string;
  fullName?: string;
  email?: string;
  avatarUrl?: string;
}

export interface TrelloOrganization {
  id: string;
  name: string;
  displayName: string;
  desc?: string;
}

export interface TrelloBoard {
  id: string;
  name: string;
  desc?: string;
  closed: boolean;
  idOrganization?: string | null;
  prefs?: { background?: string };
}

export interface TrelloList {
  id: string;
  name: string;
  pos: number;
  closed: boolean;
  idBoard: string;
}

export interface TrelloCard {
  id: string;
  name: string;
  desc?: string;
  pos: number;
  closed: boolean;
  idList: string;
  due?: string | null;
  dueComplete?: boolean;
  idLabels?: string[];
}

export interface TrelloLabel {
  id: string;
  name: string;
  color: string | null;
}

/**
 * Client HTTP Trello côté serveur : la clé applicative et le token utilisateur
 * restent ici et ne transitent jamais vers le navigateur.
 */
export class TrelloClient {
  constructor(private readonly token: string) {}

  private assertConfigured(): void {
    if (!trelloConfigured()) {
      throw new HttpError(
        503,
        'TRELLO_NOT_CONFIGURED',
        'La synchronisation Trello n’est pas configurée sur le serveur',
      );
    }
  }

  private async request<T>(
    method: string,
    path: string,
    params: Record<string, string | number | boolean | undefined> = {},
  ): Promise<T> {
    this.assertConfigured();
    const url = new URL(`${BASE_URL}${path}`);
    url.searchParams.set('key', env.TRELLO_API_KEY as string);
    url.searchParams.set('token', this.token);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }

    const response = await fetch(url, { method });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new HttpError(
        response.status === 401 ? 401 : 502,
        'TRELLO_API_ERROR',
        `Appel Trello ${method} ${path} échoué (${response.status})`,
        body.slice(0, 500),
      );
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  me(): Promise<TrelloMember> {
    return this.request<TrelloMember>('GET', '/members/me', {
      fields: 'id,username,fullName,email,avatarUrl',
    });
  }

  organizations(): Promise<TrelloOrganization[]> {
    return this.request<TrelloOrganization[]>('GET', '/members/me/organizations', {
      fields: 'id,name,displayName,desc',
    });
  }

  boards(): Promise<TrelloBoard[]> {
    return this.request<TrelloBoard[]>('GET', '/members/me/boards', {
      fields: 'id,name,desc,closed,idOrganization,prefs',
      filter: 'open',
    });
  }

  listsForBoard(boardId: string): Promise<TrelloList[]> {
    return this.request<TrelloList[]>('GET', `/boards/${boardId}/lists`, {
      fields: 'id,name,pos,closed,idBoard',
    });
  }

  cardsForBoard(boardId: string): Promise<TrelloCard[]> {
    return this.request<TrelloCard[]>('GET', `/boards/${boardId}/cards`, {
      fields: 'id,name,desc,pos,closed,idList,due,dueComplete,idLabels',
    });
  }

  labelsForBoard(boardId: string): Promise<TrelloLabel[]> {
    return this.request<TrelloLabel[]>('GET', `/boards/${boardId}/labels`, {
      fields: 'id,name,color',
      limit: 1000,
    });
  }

  createBoard(name: string, desc?: string, idOrganization?: string): Promise<TrelloBoard> {
    return this.request<TrelloBoard>('POST', '/boards', {
      name,
      desc,
      idOrganization,
      defaultLists: false,
    });
  }

  updateBoard(
    id: string,
    fields: { name?: string; desc?: string; closed?: boolean },
  ): Promise<TrelloBoard> {
    return this.request<TrelloBoard>('PUT', `/boards/${id}`, fields);
  }

  deleteBoard(id: string): Promise<void> {
    return this.request<void>('DELETE', `/boards/${id}`);
  }

  createList(name: string, idBoard: string, pos?: number): Promise<TrelloList> {
    return this.request<TrelloList>('POST', '/lists', { name, idBoard, pos });
  }

  updateList(
    id: string,
    fields: { name?: string; pos?: number; closed?: boolean },
  ): Promise<TrelloList> {
    return this.request<TrelloList>('PUT', `/lists/${id}`, fields);
  }

  createCard(name: string, idList: string, desc?: string, pos?: number): Promise<TrelloCard> {
    return this.request<TrelloCard>('POST', '/cards', { name, idList, desc, pos });
  }

  updateCard(
    id: string,
    fields: { name?: string; desc?: string; pos?: number; idList?: string; closed?: boolean },
  ): Promise<TrelloCard> {
    return this.request<TrelloCard>('PUT', `/cards/${id}`, fields);
  }

  deleteCard(id: string): Promise<void> {
    return this.request<void>('DELETE', `/cards/${id}`);
  }

  createOrganization(displayName: string, desc?: string): Promise<TrelloOrganization> {
    return this.request<TrelloOrganization>('POST', '/organizations', { displayName, desc });
  }
}
