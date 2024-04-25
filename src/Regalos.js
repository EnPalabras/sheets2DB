import { getRows } from './Google.js'
import dotenv from 'dotenv'

dotenv.config()

const { GOOGLE_SHEET_ID_REGALOS } = process.env

const table_name = 'Ventas (Automático)!A1:Y'

const toArrayOfObjects = (keys, values) => {
  return values.map((value) => {
    return keys.reduce((object, key, index) => {
      if (value[index] === '') {
        object[key] = null
      } else {
        object[key] = value[index]
      }
      return object
    }, {})
  })
}

const readDataRegalos = async () => {
  const response = await getRows(table_name, GOOGLE_SHEET_ID_REGALOS)
  const values = response.data.values
  const orders = toArrayOfObjects(values[0], values.slice(1))

  return orders
}

const transformOrders = (orders) => {
  const editedOrders = []

  orders.map((order) => {
    const editedOrder = {}

    const fechaOrden = new Date(
      order['fecha_compra'].split('/')[2],
      order['fecha_compra'].split('/')[1] - 1,
      order['fecha_compra'].split('/')[0]
    )
    if (
      editedOrders.map((order) => order['idEP']).includes(order['id_orden'])
    ) {
      const editedOrder = editedOrders.find(
        (registeredOrder) => registeredOrder['idEP'] === order['id_orden']
      )

      editedOrder['Products'].push({
        producto: order['producto'],
        cantidad: parseInt(order['cantidad_juegos']),
        variante: null,
        precioUnitario:
          parseFloat(
            order['precio_unit_prod']
              .replace('$', '')
              .replace('.', '')
              .replace(',', '.')
          ) ?? 0,
        precioTotal:
          (parseFloat(
            order['precio_total_prod']
              .replace('$', '')
              .replace('.', '')
              .replace(',', '.')
          ) ?? 0) * (parseFloat(order['precio_total_prod']) ?? 0),
        moneda: 'ARS',
      })
    } else if (
      !editedOrders.map((order) => order['idEP']).includes(order['id_orden'])
    ) {
      editedOrder['idEP'] = order['id_orden']
      editedOrder['estado'] = 'Finalizada'
      editedOrder['fechaCreada'] = fechaOrden
      editedOrder['canalVenta'] = order['canal_venta']
      console.log(order['canal_venta'])
      editedOrder['nombre'] = order['nombre_completo']
      editedOrder['mail'] = order['mail']
      editedOrder['DNI'] = order['dni']
      editedOrder['telefono'] = ''
      editedOrder['montoTotal'] = order['ingresos_brutos']
        ? parseFloat(
            order['ingresos_brutos']
              .replace('$', '')
              .replace('.', '')
              .replace(',', '.')
          )
        : 0
      editedOrder['Products'] = []

      editedOrder['Products'].push({
        producto: order['producto'],
        cantidad: parseInt(order['cantidad_juegos']),
        variante: null,
        precioUnitario:
          parseFloat(
            order['precio_unit_prod']
              .replace('$', '')
              .replace('.', '')
              .replace(',', '.')
          ) ?? 0,
        precioTotal:
          (parseFloat(
            order['precio_total_prod']
              .replace('$', '')
              .replace('.', '')
              .replace(',', '.')
          ) ?? 0) * (parseFloat(order['precio_total_prod']) ?? 0),
        moneda: 'ARS',
      })

      editedOrder['Shipment'] = []

      editedOrder['Shipment'].push({
        estado: 'Enviado',
        fechaEnvio: fechaOrden,
        fechaEntrega: fechaOrden,
        tipoEnvio: order['tipo_envio'],
        shipCost: order['costo_envio']
          ? parseFloat(
              order['costo_envio']
                .replace('$', '')
                .replace('.', '')
                .replace(',', '.')
            )
          : 0,
        nombreEnvio: order['tipo_envio'],
        codigoPostal: '',
        ciudad: order['ciudad'],
        provincia: order['provincia'],
        pais: order['pais'],
      })

      editedOrder['Payments'] = []

      editedOrder['Payments'].push({
        estado: 'approved',
        fechaPago: fechaOrden,
        montoPago:
          parseFloat(
            order['ingresos_brutos']
              .replace('$', '')
              .replace('.', '')
              .replace(',', '.')
          ) ?? 0,
        montoRecibido:
          parseFloat(
            order['ingresos_netos']
              .replace('$', '')
              .replace('.', '')
              .replace(',', '.')
          ) ?? 0,
        montoTotal:
          parseFloat(
            order['ingresos_brutos']
              .replace('$', '')
              .replace('.', '')
              .replace(',', '.')
          ) ?? 0,
        montoRecibido:
          parseFloat(
            order['ingresos_netos']
              .replace('$', '')
              .replace('.', '')
              .replace(',', '.')
          ) ?? 0,
        metodoPago: order['metodo_pago'],
        tipoPago: order['metodo_pago'],
        moneda: 'ARS',
        cuentaDestino: order['metodo_pago'],
      })

      editedOrders.push(editedOrder)
    }
  })

  return editedOrders
}

const mainRegalos = async () => {
  const data = await readDataRegalos()
  const transformedData = transformOrders(data)

  for (const order of transformedData) {
    console.log(order.idEP)
    // const res = await fetch('https://systemep.vercel.app/api/sales/others', {
    const res = await fetch('http://localhost:3001/api/sales/others', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(order),
    })

    const data = await res.json()
  }
}

export default mainRegalos
