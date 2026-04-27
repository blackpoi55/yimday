"use client";

import Swal from "sweetalert2";

export function showSuccessAlert(message: string, title = "บันทึกสำเร็จ") {
  return Swal.fire({
    icon: "success",
    title,
    text: message,
    confirmButtonText: "ตกลง",
  });
}

export function showErrorAlert(message: string, title = "เกิดข้อผิดพลาด") {
  return Swal.fire({
    icon: "error",
    title,
    text: message,
    confirmButtonText: "ตกลง",
  });
}

export function showWarningAlert(message: string, title = "ข้อมูลไม่ถูกต้อง") {
  return Swal.fire({
    icon: "warning",
    title,
    text: message,
    confirmButtonText: "ตกลง",
  });
}

export function showConfirmAlert(title: string, text: string, confirmButtonText = "ยืนยัน", cancelButtonText = "ยกเลิก") {
  return Swal.fire({
    icon: "warning",
    title,
    text,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
    focusCancel: true,
  });
}
