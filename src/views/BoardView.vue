<template>
  <div class="flex flex-col items-center w-full h-screen">
    <header v-if="selectedBoardId" class="flex h-[75px] w-full items-center justify-between border-b border-gray-200 p-4">
      <div class="flex-1"/>
      <div class="flex justify-end space-x-2">
        <button @click="createList" class="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          NEW LIST
        </button>

        <button @click="deleteBoard" class="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700">
          <i class="fa-regular fa-trash-alt pr-2"></i>
          DELETE BOARD
        </button>
      </div>
    </header>
    <div class="flex justify-center w-full h-full py-4 h-max-screen">
      <div class="w-full h-full px-4">
        <div class="flex -mx-4 overflow-x-auto h-full max-h-[89vh]">
          <div v-for="list in lists" :key="list.id" class="px-4 flex-none w-[25%] max-h-screen">
            <div class="flex flex-col bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 py-9">
              <div class="flex justify-center">
                <div class="bg-indigo-600 h-6 rounded-t-lg mb-2 py-2 w-[95%]"></div>
              </div>
              <div class="flex flex-col justify-between flex-1 p-6">
                <div class="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  {{ list.name }}
                  <div class="ml-auto">
                    <div class="flex space-x-2">
                      <button @click="editList(list)" class="px-2 py-2 bg-indigo-600 text-white text-xs font-medium rounded-md hover:bg-indigo-800 ">
                        <i class="fa-regular fa-pen-to-square "></i>
                      </button>
                      <button @click="deleteList(list)" class="px-2 py-2 bg-red-500 text-white text-xs font-medium rounded-md hover:bg-red-700 ">
                        <i class="fa-regular fa-trash-alt"></i>
                      </button>
                    </div>
                  </div>
                </div>
                <button @click="addCard(list.id)" class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-800 opacity-70 focus:outline-none" type="button">
                  <svg class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Ajouter une carte
                </button>
                <ul @dragover.prevent @drop="event => onDrop(event, list)" class="mt-4 space-y-3 h-full list-container">
                  <Card v-for="card in list.cards" :key="card.id" :task="card" @card-deleted="handleCardDeleted" />
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

</template>


<style>
.list-container {
  min-height: 100px;
}
</style>


<script>
import { defineComponent } from 'vue';
import axios from 'axios';
import Card from "@/components/Task_components/Card.vue";
import Swal from "sweetalert2";

export default defineComponent({
  components: {
    Card
  },
  props: ['selectedBoardId'],
  data() {
    return {
      lists: [],
      boards: []
    };
  },
  watch: {
    selectedBoardId: {
      immediate: true,
      handler(newVal) {
        if (newVal) {
          this.getLists(newVal);
        }
      }
    }
  },
  methods: {
    getLists(boardId) {
      const API_KEY = import.meta.env.VITE_TRELLO_CLIENT_ID;
      const API_TOKEN = localStorage.getItem("token");

      axios.get(`https://api.trello.com/1/boards/${boardId}/lists?key=${API_KEY}&token=${API_TOKEN}`)
          .then(response => {
            const lists = response.data;
            return Promise.all(lists.map(list =>
                axios.get(`https://api.trello.com/1/lists/${list.id}/cards?key=${API_KEY}&token=${API_TOKEN}`)
                    .then(response => {
                      // Trier les cartes par leur position
                      list.cards = response.data.sort((a, b) => a.pos - b.pos);
                      return list;
                    })
            ));
          })
          .then(listsWithSortedCards => {
            this.lists = listsWithSortedCards;
          })
          .catch(error => {
            console.error('Erreur lors de la récupération des listes ou des cartes :', error);
          });
    },
    editList(list) {
      const newTitle = prompt('Enter new list title', list.name);
      if (newTitle !== null && newTitle !== '') {
        const API_KEY = import.meta.env.VITE_TRELLO_CLIENT_ID;
        const API_TOKEN = localStorage.getItem("token");

        axios.put(`https://api.trello.com/1/lists/${list.id}?key=${API_KEY}&token=${API_TOKEN}`, {
          name: newTitle
        })
            .then(response => {
              console.log('List updated successfully:', response.data);
              list.name = newTitle;
            })
            .catch(error => {
              console.error('Erreur lors de la mise à jour de la liste Trello :', error);
            });
      }
    },
    deleteList(list) {
      Swal.fire({
        title: `Are you sure you want to delete the list "${list.name}"?`,
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
      }).then((result) => {
        if (result.isConfirmed) {
          const API_KEY = import.meta.env.VITE_TRELLO_CLIENT_ID;
          const API_TOKEN = localStorage.getItem("token");

          axios.put(`https://api.trello.com/1/lists/${list.id}/closed?value=true&key=${API_KEY}&token=${API_TOKEN}`)
              .then(response => {
                console.log('List closed (deleted) successfully:', response.data);
                this.lists = this.lists.filter(item => item.id !== list.id);
                Swal.fire(
                    'Deleted!',
                    'Your list has been deleted.',
                    'success'
                );
              })
              .catch(error => {
                console.error('Error when trying to close (delete) the Trello list:', error);
                Swal.fire(
                    'Failed!',
                    'There was an error deleting your list.',
                    'error'
                );
              });
        }
      });
    },
    deleteBoard() {
      const boardId = this.selectedBoardId;
      if (!boardId) {
        console.error('No board ID provided for deletion.');
        Swal.fire('Error', 'No board ID provided.', 'error');
        return;
      }

      Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
      }).then((result) => {
        if (result.isConfirmed) {
          const API_KEY = import.meta.env.VITE_TRELLO_CLIENT_ID;
          const API_TOKEN = localStorage.getItem("token");

          axios.delete(`https://api.trello.com/1/boards/${boardId}?key=${API_KEY}&token=${API_TOKEN}`)
              .then(() => {
                this.boards = this.boards.filter(board => board.id !== boardId);
                Swal.fire(
                    'Deleted!',
                    'The board has been deleted.',
                    'success'
                ).then(() => {
                  window.location.href = '/';
                });
              })
              .catch(error => {
                console.error('Error when trying to delete the Trello board:', error);
                Swal.fire(
                    'Failed!',
                    'There was an error deleting your board.',
                    'error'
                );
              });
        }
      });
    },
    async addCard(listId) {
      const { value: cardName } = await Swal.fire({
        title: 'Entrez le nom de la nouvelle carte',
        input: 'text',
        inputPlaceholder: 'Nom de la carte',
        showCancelButton: true,
        confirmButtonText: 'Ajouter',
        cancelButtonText: 'Annuler',
        inputValidator: (value) => {
          if (!value) {
            return 'Vous devez saisir un nom pour la carte !';
          }
        }
      });

      if (!cardName) return;

      const API_KEY = import.meta.env.VITE_TRELLO_CLIENT_ID;
      const API_TOKEN = localStorage.getItem("token");

      try {
        const response = await axios.post(`https://api.trello.com/1/cards?key=${API_KEY}&token=${API_TOKEN}`, {
          name: cardName,
          idList: listId,
        });

        console.log('Carte créée avec succès:', response.data);
        const newCard = response.data;
        const listIndex = this.lists.findIndex(list => list.id === listId);
        if (listIndex !== -1) {
          this.lists[listIndex].cards.push(newCard);
        }

        await Swal.fire({
          title: 'Succès!',
          text: 'La carte a été ajoutée avec succès.',
          icon: 'success',
          confirmButtonText: 'Super'
        });
      } catch (error) {
        console.error("Erreur lors de l'ajout de la carte :", error);

        await Swal.fire({
          title: 'Erreur!',
          text: "Erreur lors de l'ajout de la carte.",
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    },
    handleCardDeleted(cardId) {
      const listIndex = this.lists.findIndex(list => list.cards.some(card => card.id === cardId));
      if (listIndex !== -1) {
        this.lists[listIndex].cards = this.lists[listIndex].cards.filter(card => card.id !== cardId);
      }
    },
    calculateNewPos(newList, cardIndexInNewList) {
      // Si la liste est vide, retourner une position par défaut
      if (newList.cards.length === 0) {
        return 65536; // Valeur arbitraire indiquant une position "au début" de la liste vide
      }
      // Si la carte est déplacée au début de la liste
      if (cardIndexInNewList === 0) {
        return newList.cards[0].pos / 2;
      }
      // Si la carte est déplacée à la fin de la liste
      if (cardIndexInNewList >= newList.cards.length) {
        return newList.cards[newList.cards.length - 1].pos + 65536;
      }
      // Si la carte est déplacée entre deux cartes
      const posBefore = newList.cards[cardIndexInNewList - 1].pos;
      const posAfter = newList.cards[cardIndexInNewList].pos;
      return (posBefore + posAfter) / 2;
    },

    async updateCardOnTrello(cardId, newListId, newPos) {
      const apiKey = import.meta.env.VITE_TRELLO_CLIENT_ID;
      const apiToken = localStorage.getItem("token");
      await axios.put(`https://api.trello.com/1/cards/${cardId}?key=${apiKey}&token=${apiToken}`, {
        idList: newListId,
        pos: newPos,
      });
      console.log(`Carte ${cardId} mise à jour avec newListId=${newListId} et newPos=${newPos}`);
    },
    async onDrop(event, newList) {
      event.preventDefault();
      const cardId = event.dataTransfer.getData("text/plain");
      const fromList = this.findListByCardId(cardId);
      const card = this.findCardById(cardId);

      // Nouvelle logique pour déterminer l'index de la nouvelle carte dans la liste
      let cardIndexInNewList;
      if (event.target.classList.contains('list-container') || event.target.classList.contains('placeholder')) {
        // Si l'événement de dépôt se produit directement sur le conteneur de la liste ou un placeholder spécifique,
        // cela signifie que la liste est vide ou que l'utilisateur vise explicitement la fin de la liste.
        cardIndexInNewList = 0; // Ajouter au début pour une liste vide ou à la position spécifiée pour une liste avec un placeholder
      } else {
        const targetElement = event.target.closest('li');
        cardIndexInNewList = targetElement ? [...targetElement.parentElement.children].indexOf(targetElement) : newList.cards.length;
      }

      if (!fromList || !card) {
        console.error("Impossible de trouver la carte ou la liste source");
        return;
      }

      const newPos = this.calculateNewPos(newList, cardIndexInNewList);

      try {
        await this.updateCardOnTrello(cardId, newList.id, newPos);
        // Mettre à jour l'état local pour refléter le changement
        fromList.cards = fromList.cards.filter(c => c.id !== cardId);
        if (newList.cards.length === 0 || cardIndexInNewList === 0) {
          newList.cards.unshift(card); // Ajouter au début si la liste est vide ou visée explicitement
        } else {
          newList.cards.splice(cardIndexInNewList, 0, card);
        }
        this.lists = [...this.lists]; // Forcer la mise à jour pour garantir la réactivité
      } catch (error) {
        console.error("Erreur lors de la mise à jour de la carte via l'API:", error);
      }
    },
    findListByCardId(cardId) {
      return this.lists.find(list => list.cards.some(card => card.id === cardId));
    },

    findCardById(cardId) {
      for (const list of this.lists) {
        const card = list.cards.find(card => card.id === cardId);
        if (card) {
          return card;
        }
      }
      return null;
    },
    createList() {
      const API_KEY = import.meta.env.VITE_TRELLO_CLIENT_ID;
      const API_TOKEN = localStorage.getItem("token");
      const boardId = this.selectedBoardId;

      Swal.fire({
        title: 'Entrez le nom de la nouvelle liste',
        input: 'text',
        inputAttributes: {
          autocapitalize: 'off'
        },
        showCancelButton: true,
        confirmButtonText: 'Créer',
        showLoaderOnConfirm: true,
        preConfirm: (name) => {
          return axios.post(`https://api.trello.com/1/lists?key=${API_KEY}&token=${API_TOKEN}&name=${encodeURIComponent(name)}&idBoard=${boardId}`)
              .then(response => {
                console.log('Liste créée avec succès:', response.data);
                this.lists.push(response.data);
                Swal.fire({
                  title: `Liste '${name}' créée avec succès!`
                });
              })
              .catch(error => {
                Swal.showValidationMessage(
                    `Échec de la création : ${error}`
                );
              });
        },
        allowOutsideClick: () => !Swal.isLoading()
      });
    }
  }
});
</script>

