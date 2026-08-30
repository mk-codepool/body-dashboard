import { Injectable, NotFoundException } from '@nestjs/common';
import { StorageService, MeasurementRecord } from '../storage/storage.service.js';

@Injectable()
export class MeasurementsService {
  constructor(private readonly storageService: StorageService) {}

  async getAll(): Promise<MeasurementRecord[]> {
    return this.storageService.getMeasurements();
  }

  async getById(id: string): Promise<MeasurementRecord> {
    const list = await this.storageService.getMeasurements();
    const item = list.find(m => m.id === id);
    if (!item) {
      throw new NotFoundException(`Pomiar o ID ${id} nie został znaleziony.`);
    }
    return item;
  }

  async create(record: Omit<MeasurementRecord, 'id'> & { id?: string }): Promise<MeasurementRecord> {
    const list = await this.storageService.getMeasurements();
    const newRecord: MeasurementRecord = {
      ...record,
      id: record.id || `m_${Date.now()}`,
    };
    // Dodajemy nowy pomiar na początek listy (najnowszy)
    const updated = [newRecord, ...list];
    await this.storageService.saveMeasurements(updated);
    return newRecord;
  }

  async update(id: string, updateData: Partial<MeasurementRecord>): Promise<MeasurementRecord> {
    const list = await this.storageService.getMeasurements();
    const index = list.findIndex(m => m.id === id);
    if (index === -1) {
      throw new NotFoundException(`Pomiar o ID ${id} nie został znaleziony.`);
    }
    const updatedItem = { ...list[index], ...updateData, id };
    list[index] = updatedItem;
    await this.storageService.saveMeasurements(list);
    return updatedItem;
  }

  async delete(id: string): Promise<{ success: boolean; id: string }> {
    const list = await this.storageService.getMeasurements();
    const filtered = list.filter(m => m.id !== id);
    if (filtered.length === list.length) {
      throw new NotFoundException(`Pomiar o ID ${id} nie został znaleziony.`);
    }
    await this.storageService.saveMeasurements(filtered);
    return { success: true, id };
  }

  async reset(): Promise<MeasurementRecord[]> {
    return this.storageService.resetMeasurements();
  }
}
