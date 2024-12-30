// Constantes y configuración
const CONFIG = {
  PATTERNS: {
    name: /^[A-Za-zÀ-ÿ\s]{2,50}$/,
    phone: /^\+593\d{9}$/
  },
  MESSAGES: {
    nameInvalid: "Por favor, ingrese un nombre válido (solo letras y espacios, entre 2 y 50 caracteres).",
    phoneInvalid: "Por favor, ingrese un número de teléfono válido en formato: +593XXXXXXXXX",
    success: "Datos enviados correctamente.",
    error: "Error al enviar datos. Por favor, intente nuevamente.",
    serverError: "Error en el servidor. Por favor, intente más tarde.",
    networkError: "Error de conexión. Verifique su conexión a internet.",
  },
  DEBOUNCE_DELAY: 300
};

/**
 * Función de debounce para evitar múltiples envíos
 * @param {Function} func - Función a ejecutar
 * @param {number} wait - Tiempo de espera en ms
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Muestra mensajes al usuario de manera más elegante
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de mensaje ('error' o 'success')
 */
function showNotification(message, type = 'info') {
  // Por ahora usamos alert, pero esto podría mejorarse con una librería de notificaciones
  alert(message);
}

/**
 * Valida un campo de entrada
 * @param {HTMLInputElement} input - Campo de entrada
 * @param {string} pattern - Nombre del patrón a usar
 * @returns {boolean} - Resultado de la validación
 */
function validateField(input, pattern) {
  if (!input) return false;
  const value = input.value.trim();
  return CONFIG.PATTERNS[pattern].test(value);
}

/**
 * Añade feedback visual al campo
 * @param {HTMLInputElement} input - Campo de entrada
 * @param {boolean} isValid - Si el campo es válido
 */
function setFieldValidationState(input, isValid) {
  if (!input) return;
  
  input.classList.remove('is-valid', 'is-invalid');
  input.classList.add(isValid ? 'is-valid' : 'is-invalid');
}

/**
 * Maneja el envío del formulario
 * @param {string} formSelector - Selector del formulario
 * @param {string} nameSelector - Selector del campo nombre
 * @param {string} phoneSelector - Selector del campo teléfono
 */
function handleFormSubmit(formSelector, nameSelector, phoneSelector) {
  const form = document.querySelector(formSelector);
  if (!form) {
    console.error(`Formulario no encontrado: ${formSelector}`);
    return;
  }

  const nameInput = document.querySelector(nameSelector);
  const phoneInput = document.querySelector(phoneSelector);

  if (!nameInput || !phoneInput) {
    console.error('Campos requeridos no encontrados');
    return;
  }

  // Validación en tiempo real
  nameInput.addEventListener('input', debounce(() => {
    const isValid = validateField(nameInput, 'name');
    setFieldValidationState(nameInput, isValid);
  }, CONFIG.DEBOUNCE_DELAY));

  phoneInput.addEventListener('input', debounce(() => {
    const isValid = validateField(phoneInput, 'phone');
    setFieldValidationState(phoneInput, isValid);
  }, CONFIG.DEBOUNCE_DELAY));

  // Manejo del envío
  form.addEventListener('submit', async function(event) {
    event.preventDefault();

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();

    // Validación antes del envío
    if (!validateField(nameInput, 'name')) {
      showNotification(CONFIG.MESSAGES.nameInvalid, 'error');
      nameInput.focus();
      return;
    }

    if (!validateField(phoneInput, 'phone')) {
      showNotification(CONFIG.MESSAGES.phoneInvalid, 'error');
      phoneInput.focus();
      return;
    }

    try {
      const response = await fetch('/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ name, phone })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || CONFIG.MESSAGES.serverError);
      }

      const data = await response.json();
      showNotification(CONFIG.MESSAGES.success, 'success');
      form.reset();

      // Limpiar estados de validación
      [nameInput, phoneInput].forEach(input => {
        input.classList.remove('is-valid', 'is-invalid');
      });

      // Cerrar popup si está abierto
      const popupWindow = document.querySelector('.popup-window');
      if (popupWindow) {
        popupWindow.style.display = 'none';
      }

    } catch (error) {
      console.error('Error en el envío:', error);
      showNotification(
        error.message || CONFIG.MESSAGES.networkError,
        'error'
      );
    }
  });
}

/**
 * Maneja el popup de feedback
 */
function initPopup() {
  const elements = {
    feedbackBtn: document.querySelector('.feedback'),
    closeBtn: document.querySelector('.close-popup'),
    popup: document.querySelector('.popup-window')
  };

  if (!elements.popup) return;

  // Mostrar popup
  if (elements.feedbackBtn) {
    elements.feedbackBtn.addEventListener('click', () => {
      elements.popup.style.display = 'block';
    });
  }

  // Cerrar popup
  if (elements.closeBtn) {
    elements.closeBtn.addEventListener('click', () => {
      elements.popup.style.display = 'none';
    });
  }

  // Cerrar al hacer clic fuera
  document.addEventListener('click', (event) => {
    if (event.target === elements.popup) {
      elements.popup.style.display = 'none';
    }
  });

  // Cerrar con tecla Escape
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && elements.popup.style.display === 'block') {
      elements.popup.style.display = 'none';
    }
  });
}

/**
 * Inicializa la navegación suave
 */
function initSmoothNavigation() {
  const links = document.querySelectorAll('.navigate');
  
  links.forEach(link => {
    link.addEventListener('click', (event) => {
      event.preventDefault();

      const targetId = link.getAttribute('data-target');
      const targetForm = document.getElementById(targetId);

      if (targetForm) {
        targetForm.style.display = 'block';
        targetForm.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

/**
 * Inicialización cuando el DOM está listo
 */
document.addEventListener('DOMContentLoaded', () => {
  try {
    // Inicializar formularios
    handleFormSubmit('#dataForm', '#name', '#phone');
    handleFormSubmit('#dataForm2', '#name2', '#phone2');
    handleFormSubmit('#dataForm3', '#name3', '#phone3');

    // Inicializar navegación
    initSmoothNavigation();

    // Inicializar popup
    initPopup();

  } catch (error) {
    console.error('Error en la inicialización:', error);
  }
});