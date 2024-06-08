<template>
  <div>
    <h1>Cartes Trello</h1>
    <ul>
      <li v-for="card in cards" :key="card.id">
        {{ card.name }} (Liste: {{ card.listName }})
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  data() {
    return {
      cards: []
    };
  },
  mounted() {
    const apiKey = '941b1a22a395dca6357eb9c69631b8a3';
    const apiToken = '934b70f4d2188508a12807bdf178668ffc31211adcaba72a3e1662144fb11224';
    const boardId = '65f71acf74f1cf62f14f9ed1';

    fetch(`https://api.trello.com/1/boards/${boardId}/cards?key=${apiKey}&token=${apiToken}`)
        .then(response => {
          if (!response.ok) {
            throw new Error('Erreur de réseau lors de la récupération des données');
          }
          return response.json();
        })
        .then(cards => {
          this.cards = cards.map(card => ({
            id: card.id,
            name: card.name,
            listName: card.idList
          }));
        })
        .catch(err => console.error(err));
  }
};
</script>
