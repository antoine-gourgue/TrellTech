import axios from 'axios';

export default class TrelloOAuth {
    clientId: string;
    redirectUri: 'http://127.0.0.1:5173/auth/trello/callback';
    state: string;
    scope: string;

    constructor(redirectUri: string, scope: string = 'read,write', state: string = 'uniqueStateString') {
        this.clientId = import.meta.env.VITE_TRELLO_CLIENT_ID;
        this.redirectUri = redirectUri;
        this.scope = scope;
        this.state = state;
    }

    /**
     * Génère l'URL de redirection pour l'authentification OAuth de Trello.
     */
    getAuthorizationUrl(): string {
        console.log({
            clientId: this.clientId,
        })
        console.log(
            'https://trello.com/1/authorize?response_type=token&key=',
            this.clientId,
            '&return_url=',
            encodeURIComponent(this.redirectUri),
            '&scope=',
            this.scope,
            '&expiration=never&name=TrellTech&state=',
            this.state
        )
        return `https://trello.com/1/authorize?response_type=token&key=${this.clientId}&return_url=${encodeURIComponent(this.redirectUri)}&scope=${this.scope}&expiration=never&name=TrellTech&state=${this.state}`;
    }

    /**
     * Échange le code d'autorisation contre un token d'accès.
     * Cette fonction est présentée pour la complétude mais n'est pas directement utilisable avec Trello.
     */
    async exchangeCodeForAccessToken(code: string): Promise<string> {
        const response = await axios.post('https://trello.com/1/OAuthGetAccessToken', {
            code: code,
            client_id: this.clientId,
            client_secret: import.meta.env.VITE_TRELLO_CLIENT_SECRET,
            redirect_uri: this.redirectUri,
            grant_type: 'authorization_code',
        });
        return response.data.access_token;
    }

    async fetchUserInfo(token: string) {
        try {
            const response = await axios.get(`https://api.trello.com/1/members/me`, {
                params: {
                    key: import.meta.env.VITE_TRELLO_CLIENT_ID,
                    token: token,
                },
            });

            console.log('User info:', response.data);

            localStorage.setItem('trello_user_info', JSON.stringify(response.data));
        } catch (error) {
            if (error.response) {
                console.log(error.response.data);
                console.log(error.response.status);
                console.log(error.response.headers);
            } else if (error.request) {
                console.log(error.request);
            } else {
                console.log('Error', error.message);
            }
        }

    }
}

// Utilisation
const trelloAuth = new TrelloOAuth('http://localhost:5173/auth/trello/callback');
console.log('URL de connexion Trello:', trelloAuth.getAuthorizationUrl());
