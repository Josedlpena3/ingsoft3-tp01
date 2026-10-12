# Las direcciones de preprod salen de los recursos de verdad, no de un texto
# que yo escribi: si cambia el puerto en el codigo, el output cambia solo.

output "api_url" {
  description = "La api de preprod, vista desde el host."
  value       = "http://localhost:${docker_container.api.ports[0].external}"
}

output "front_url" {
  description = "El front de preprod, vista desde el host."
  value       = "http://localhost:${docker_container.front.ports[0].external}"
}

output "imagen_desplegada" {
  description = "Que imagen esta corriendo preprod. Es la del TP7, por su commit."
  value       = local.imagen_api
}

output "como_verificar" {
  description = "Los tres pedidos que prueban que preprod es un ENTORNO y no tres contenedores sueltos."
  value = {
    vida       = "curl http://localhost:${docker_container.api.ports[0].external}/health"
    toca_la_bd = "curl http://localhost:${docker_container.api.ports[0].external}/api/tutorials"
    front      = "curl -I http://localhost:${docker_container.front.ports[0].external}/"
  }
}
