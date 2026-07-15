import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

const brandSwal = Swal.mixin({
  buttonsStyling: false,
  reverseButtons: true,
  focusCancel: true,
  customClass: {
    popup: "app-swal-popup",
    title: "app-swal-title",
    htmlContainer: "app-swal-text",
    actions: "app-swal-actions",
    confirmButton: "btn btn-danger",
    cancelButton: "btn btn-secondary",
  },
});

export async function confirmAction(options: {
  title: string;
  text: string;
  confirmText?: string;
}): Promise<boolean> {
  const result = await brandSwal.fire({
    title: options.title,
    text: options.text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: options.confirmText ?? "Eliminar",
    cancelButtonText: "Cancelar",
  });

  return result.isConfirmed;
}

export async function showSuccess(title: string, text?: string): Promise<void> {
  await brandSwal.fire({
    title,
    text,
    icon: "success",
    confirmButtonText: "Entendido",
    customClass: {
      popup: "app-swal-popup",
      title: "app-swal-title",
      htmlContainer: "app-swal-text",
      actions: "app-swal-actions",
      confirmButton: "btn btn-primary",
      cancelButton: "btn btn-secondary",
    },
  });
}

export async function showError(title: string, text?: string): Promise<void> {
  await brandSwal.fire({
    title,
    text,
    icon: "error",
    confirmButtonText: "Entendido",
    customClass: {
      popup: "app-swal-popup",
      title: "app-swal-title",
      htmlContainer: "app-swal-text",
      actions: "app-swal-actions",
      confirmButton: "btn btn-primary",
      cancelButton: "btn btn-secondary",
    },
  });
}
