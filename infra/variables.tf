# Las variables de preprod.
#
# Ninguna trae la credencial adentro: los valores entran por -var-file (un
# local.tfvars que el .gitignore cubre) o por TF_VAR_* desde el entorno.

variable "db_password" {
  description = "Contraseña del usuario root de Mongo en preprod."
  type        = string
  # sensitive la saca de los logs y del plan. Ojo con lo que NO hace: en el
  # estado queda igual, en texto plano. Por eso el estado vive fuera del repo.
  sensitive = true
}

variable "api_tag" {
  description = "Etiqueta de la imagen del TP7 a desplegar. Va un sha-<commit>: el pipeline no publica otra."
  type        = string
  # Sin default a proposito: un default obligaria a elegir una imagen "por
  # defecto", y la unica etiqueta que no se mueve es el commit. Que falte el
  # valor es mejor que desplegar algo que no se sabe que es.

  validation {
    condition     = can(regex("^sha-[0-9a-f]{40}$", var.api_tag))
    error_message = "api_tag tiene que ser sha- seguido de los 40 caracteres del commit, como los publica el pipeline del TP7."
  }
}

variable "db_usuario" {
  description = "Usuario root de Mongo en preprod."
  type        = string
  default     = "appuser"
}

variable "db_nombre" {
  description = "Base que usa la app."
  type        = string
  default     = "bezkoder_db"
}

variable "puerto_api" {
  description = "Puerto del host para la api de preprod."
  type        = number
  # 8090: ni 8080 (QA) ni 8081 (PROD). Que preprod conviva sin pisarlos es
  # parte de la consigna, no una comodidad.
  default = 8090
}

variable "puerto_front" {
  description = "Puerto del host para el front de preprod."
  type        = number
  # 3002: ni 3000 (QA) ni 3001 (PROD).
  default = 3002
}
