'use server'

import { scanRegisteredServices } from '@/data/gmail'

export async function scanServicesAction() {
  return scanRegisteredServices()
}
