import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { databaseState } from '../config/database';
import { Alarm, Fibre, HealthScore, Measurement, OtdrTestResult, Prediction, RTU } from '../models';
import { demoRtus } from '../data/demoData';

export const getRTUs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, search } = req.query as { status?: string; search?: string };

    if (!databaseState.connected) {
      const normalizedSearch = search?.toLowerCase().trim();
      const filtered = demoRtus.filter((item) => {
        const statusMatch = !status || item.status === status;
        const searchMatch =
          !normalizedSearch ||
          item.name.toLowerCase().includes(normalizedSearch) ||
          item.ipAddress.toLowerCase().includes(normalizedSearch) ||
          item.serialNumber.toLowerCase().includes(normalizedSearch);
        return statusMatch && searchMatch;
      });
      res.json(filtered);
      return;
    }

    const whereClause: Record<string | symbol, unknown> = {};
    if (status) {
      whereClause.status = status;
    }
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { ipAddress: { [Op.iLike]: `%${search}%` } },
        { serialNumber: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const rtus = await RTU.findAll({
      where: whereClause,
      order: [['id', 'ASC']],
    });

    res.json(rtus);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch RTUs' });
  }
};

export const getRTUById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!databaseState.connected) {
      const id = Number(req.params.id);
      const rtu = demoRtus.find((item) => item.id === id);
      if (!rtu) {
        res.status(404).json({ error: 'RTU not found' });
        return;
      }
      res.json(rtu);
      return;
    }

    const id = Number(req.params.id);
    const rtu = await RTU.findByPk(id, {
      include: [
        { model: Alarm, as: 'alarms' },
        {
          model: Fibre,
          as: 'fibres',
          include: [{ model: Measurement, as: 'measurements' }],
        },
        { model: Prediction, as: 'predictions' },
        { model: HealthScore, as: 'healthScores' },
        { model: OtdrTestResult, as: 'otdrTests' },
      ],
    });

    if (!rtu) {
      res.status(404).json({ error: 'RTU not found' });
      return;
    }

    res.json(rtu);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch RTU' });
  }
};

export const createRTU = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!databaseState.connected) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }

    const created = await RTU.create(req.body);
    res.status(201).json(created);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create RTU' });
  }
};

export const updateRTU = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!databaseState.connected) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }

    const id = Number(req.params.id);
    const rtu = await RTU.findByPk(id);

    if (!rtu) {
      res.status(404).json({ error: 'RTU not found' });
      return;
    }

    await rtu.update(req.body);
    res.json(rtu);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update RTU' });
  }
};

export const deleteRTU = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!databaseState.connected) {
      res.status(503).json({ error: 'Database not connected' });
      return;
    }

    const id = Number(req.params.id);
    const deleted = await RTU.destroy({ where: { id } });

    if (!deleted) {
      res.status(404).json({ error: 'RTU not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete RTU' });
  }
};
