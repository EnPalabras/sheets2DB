import { getRows } from './Google.js'
import dotenv from 'dotenv'

dotenv.config()

const { GOOGLE_SHEET_ID_COSHOWROOM } = process.env

const table_name = 'Export Data!A1:P'

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

const readDatacoshowroom = async () => {
  const response = await getRows(table_name, GOOGLE_SHEET_ID_COSHOWROOM)
  const values = response.data.values
  const orders = toArrayOfObjects(values[0], values.slice(1))

  return orders
}

const transformOrders = (orders) => {
  const editedOrders = []

  orders.map((order) => {
    const editedOrder = {}

    const fechaOrden =
      order['hora_compra'] !== null
        ? new Date(
            order['Fecha'].split('/')[2],
            order['Fecha'].split('/')[1] - 1,
            order['Fecha'].split('/')[0],
            order['Hora'].split(':')[0] - 3 ?? 0,
            order['Hora'].split(':')[1] ?? 0,
            order['Hora'].split(':')[2] ?? 0
          )
        : new Date(
            order['Fecha'].split('/')[2],
            order['Fecha'].split('/')[1] - 1,
            order['Fecha'].split('/')[0]
          )
    if (
      editedOrders.map((order) => order['idEP']).includes(order['ID Orden'])
    ) {
      const editedOrder = editedOrders.find(
        (registeredOrder) => registeredOrder['idEP'] === order['ID Orden']
      )

      editedOrder['Products'].push({
        producto: order['Producto'],
        cantidad: parseInt(order['Cantidad']),
        variante: order['Producto'],
        precioUnitario:
          parseFloat(
            order['Precio Unit']
              .replace('$', '')
              .replace('.', '')
              .replace(',', '.')
          ) ?? 0,
        precioTotal:
          (parseFloat(
            order['Precio Unit']
              .replace('$', '')
              .replace('.', '')
              .replace(',', '.')
          ) ?? 0) * (parseFloat(order['Cantidad']) ?? 0),
        moneda: 'ARS',
      })
    } else if (
      !editedOrders.map((order) => order['idEP']).includes(order['ID Orden'])
    ) {
      editedOrder['idEP'] = order['ID Orden']
      editedOrder['estado'] = order['Estado']
      editedOrder['fechaCreada'] = fechaOrden
      editedOrder['canalVenta'] = 'coshowroom'
      editedOrder['nombre'] = order['Cliente']
      editedOrder['mail'] = order['Email']
      editedOrder['DNI'] = order['DNI']
      editedOrder['telefono'] = ''
      editedOrder['montoTotal'] =
        parseFloat(
          order['Total'].replace('$', '').replace('.', '').replace(',', '.')
        ) ?? 0
      editedOrder['Products'] = []

      editedOrder['Products'].push({
        producto: order['Producto'],
        cantidad: parseInt(order['Cantidad']),
        variante: order['Producto'],
        precioUnitario:
          parseFloat(
            order['Precio Unit']
              .replace('$', '')
              .replace('.', '')
              .replace(',', '.')
          ) ?? 0,
        precioTotal:
          (parseFloat(
            order['Precio Unit']
              .replace('$', '')
              .replace('.', '')
              .replace(',', '.')
          ) ?? 0) * (parseFloat(order['Cantidad']) ?? 0),
        moneda: 'ARS',
      })

      editedOrder['Shipment'] = []

      editedOrder['Shipment'].push({
        estado: 'Enviado',
        fechaEnvio: fechaOrden,
        fechaEntrega: fechaOrden,
        tipoEnvio: order['Sucursal'],
        shipCost: 0,
        nombreEnvio: order['Sucursal'],
        codigoPostal: '',
        ciudad: '',
        provincia: 'CABA',
        pais: 'Argentina',
        stockDesde: 'coshowroom',
      })

      editedOrder['Payments'] = []

      editedOrder['Payments'].push({
        estado: order['Estado'],
        fechaPago: fechaOrden,
        montoPago:
          parseFloat(
            order['Total'].replace('$', '').replace('.', '').replace(',', '.')
          ) ?? 0,
        montoRecibido:
          parseFloat(
            order['Total'].replace('$', '').replace('.', '').replace(',', '.')
          ) ??
          0 -
            parseFloat(
              order['Comision']
                .replace('$', '')
                .replace('.', '')
                .replace(',', '.')
            ) ??
          0,
        montoTotal:
          parseFloat(
            order['Total'].replace('$', '').replace('.', '').replace(',', '.')
          ) ?? 0,
        montoRecibido:
          parseFloat(
            order['Total'].replace('$', '').replace('.', '').replace(',', '.')
          ) ??
          0 -
            parseFloat(
              order['Comision']
                .replace('$', '')
                .replace('.', '')
                .replace(',', '.')
            ) ??
          0,
        metodoPago: order['Metodo Pago'],
        tipoPago: order['Tipo de Pago'],
        moneda: 'ARS',
        cuentaDestino:
          order['Metodo Pago'] === 'Mercado Pago'
            ? 'Mercado Pago'
            : 'coshowroom',
      })

      editedOrders.push(editedOrder)
    }
  })

  return editedOrders
}

const mainCoShowroom = async () => {
  const data = await readDatacoshowroom()
  const transformedData = transformOrders(data)

  for (const order of transformedData) {
    console.log(order.idEP)
    const res = await fetch('https://systemep.vercel.app/api/sales/others', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(order),
    })

    const data = await res.json()
  }
}

export default mainCoShowroom
