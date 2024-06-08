<template>
  <li draggable="true" @dragstart="onDragStart($event)">
    <div :style="{ backgroundColor: getRandomColor() }" class="w-full h-2 rounded-t-lg mb-2"></div>
    <div class="flex items-center p-3 text-base font-bold text-gray-900 rounded-lg bg-gray-50 hover:bg-gray-100 group hover:shadow dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-white">
      <span class="flex-1 ms-3 whitespace-nowrap">{{ task.name }}</span>
      <button @click="editTaskName" class="inline-flex items-center justify-center px-2 py-2 ms-3 text-xs font-medium text-gray-500 bg-gray-200 rounded dark:bg-gray-700 dark:text-gray-400">
        <i class="fa-regular fa-pen-to-square text-white"></i>
      </button>
      <button @click="deleteTask" class="inline-flex items-center justify-center px-2 py-2 ms-3 text-xs font-medium text-gray-500 bg-red-200 rounded dark:bg-red-700 dark:text-gray-400">
        <i class="fa-regular fa-trash-alt text-white"></i>
      </button>
    </div>
  </li>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import axios from "axios";
import Swal from "sweetalert2";

interface Task {
  id: string;
  name: string;

}

export default defineComponent({
  props: {
    task: {
      type: Object as PropType<Task>,
      required: true,
    },
  },
  methods: {
    async editTaskName() {
      // Utiliser Swal pour demander le nouveau nom de la tâche
      const { value: newName } = await Swal.fire({
        title: 'Entrez le nouveau nom de la tâche',
        input: 'text',
        inputValue: this.task.name,
        showCancelButton: true,
        inputValidator: (value) => {
          if (!value) {
            return 'Vous devez entrer un nom !';
          }
        }
      });

      // Si newName est undefined, l'utilisateur a annulé
      if (!newName) return;

      const API_KEY = import.meta.env.VITE_TRELLO_CLIENT_ID;
      const API_TOKEN = localStorage.getItem("token");
      const cardId = this.task.id;

      try {
        const response = await axios.put(`https://api.trello.com/1/cards/${cardId}?key=${API_KEY}&token=${API_TOKEN}`, {
          name: newName
        });
        console.log('Card updated successfully', response.data);
        // Mise à jour locale pour refléter le changement sans recharger
        this.task.name = newName;

        // Notification de succès
        Swal.fire({
          title: 'Succès!',
          text: 'Le nom de la carte a été mis à jour avec succès.',
          icon: 'success',
          confirmButtonText: 'Ok'
        });
      } catch (error) {
        console.error('Error updating the card name:', error);
        // Notification d'erreur
        Swal.fire({
          title: 'Erreur!',
          text: "Erreur lors de la mise à jour du nom de la carte.",
          icon: 'error',
          confirmButtonText: 'Ok'
        });
      }
    },
    onDragStart(event) {
      event.dataTransfer.setData("text/plain", this.task.id);
    },
    async deleteTask() {
      const API_KEY = import.meta.env.VITE_TRELLO_CLIENT_ID;
      const API_TOKEN = localStorage.getItem("token");
      const cardId = this.task.id;

      // Demander une confirmation avant la suppression
      const result = await Swal.fire({
        title: 'Êtes-vous sûr?',
        text: "Vous ne pourrez pas revenir en arrière !",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Oui, supprimez-le !',
        cancelButtonText: 'Annuler'
      });

      if (result.isConfirmed) {
        try {
          await axios.delete(`https://api.trello.com/1/cards/${cardId}?key=${API_KEY}&token=${API_TOKEN}`);
          console.log('Card deleted successfully');
          this.$emit('card-deleted', cardId); // Émettre un événement pour la suppression

          // Afficher un message de succès
          Swal.fire(
              'Supprimé!',
              'Votre carte a été supprimée.',
              'success'
          );
        } catch (error) {
          console.error('Error deleting the card:', error);

          // Afficher un message d'erreur
          Swal.fire(
              'Erreur!',
              "Une erreur s'est produite lors de la suppression de la carte.",
              'error'
          );
        }
      }
    },
    getRandomColor() {
      // Génère une couleur hexadécimale aléatoire
      const letters = '0123456789ABCDEF';
      let color = '#';
      for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
      }
      return color;
    },
  },
});
</script>
