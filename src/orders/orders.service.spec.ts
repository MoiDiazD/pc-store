import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
    BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { OrdersService } from './orders.service';
import type { DatabaseTransaction } from '../database/database.provider';

describe('OrdersService', () => {
  const db = {
    transaction: vi.fn(),
  };

  const cartRepository = {
    findByUserId: vi.fn(),
    lockForCheckout: vi.fn(),
    unlockCheckout: vi.fn(),
  };

  const cartItemsRepository = {
    findByCartId: vi.fn(),
    removeByCartId: vi.fn(),
  };

  const productsRepository = {
    decrementStockIfAvailable: vi.fn(),
    incrementStock: vi.fn(),
  };

  const ordersRepository = {
    findByIdForUser: vi.fn(),
    findByUserId: vi.fn(),
    findPendingByUserId: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    updateStatus: vi.fn(),
  };

  const orderItemsRepository = {
    findByOrderId: vi.fn(),
    createMany: vi.fn(),
  };

  const paymentService = {
    createPayment: vi.fn(),
  };

  const paymentsRepository = {
    create: vi.fn(),
    findByProviderPaymentId: vi.fn(),
    updateStatus: vi.fn(),
    findByOrderId: vi.fn(),
  };

  const tx: DatabaseTransaction = {} as DatabaseTransaction;

  let service: OrdersService;

  beforeEach(() => {
    vi.clearAllMocks();

    db.transaction.mockImplementation(
        async (
            callback: (tx: DatabaseTransaction) => Promise<unknown>,
        ) => callback(tx),
    );

    service = new OrdersService(
      db as any,
      cartRepository as any,
      cartItemsRepository as any,
      productsRepository as any,
      ordersRepository as any,
      orderItemsRepository as any,
      paymentService as any,
      paymentsRepository as any,
    );
  });

  describe('findMyOrder', () => {
    it('should reject checkout when the cart does not exist', async () => {
        cartRepository.findByUserId.mockResolvedValue(undefined);

        await expect(
            service.checkout(2),
        ).rejects.toThrow(BadRequestException);

        expect(
            cartRepository.lockForCheckout,
        ).not.toHaveBeenCalled();

        expect(
            productsRepository.decrementStockIfAvailable,
        ).not.toHaveBeenCalled();

        expect(
            ordersRepository.create,
        ).not.toHaveBeenCalled();

        expect(
            paymentService.createPayment,
        ).not.toHaveBeenCalled();
    });
    it('should return the order when it belongs to the user', async () => {
      ordersRepository.findByIdForUser.mockResolvedValue({
        id: 10,
        userId: 2,
        status: 'confirmed',
        total: '100.00',
      });

      orderItemsRepository.findByOrderId.mockResolvedValue([
        {
          id: 1,
          orderId: 10,
          productId: 5,
          quantity: 1,
          unitPrice: '100.00',
        },
      ]);

      const result = await service.findMyOrder(2, 10);

      expect(
        ordersRepository.findByIdForUser,
      ).toHaveBeenCalledWith(10, 2);

      expect(result.id).toBe(10);
      expect(result.userId).toBe(2);
      expect(result.items).toHaveLength(1);
    });

    it('should throw NotFoundException when the order is not accessible', async () => {
      ordersRepository.findByIdForUser.mockResolvedValue(
        undefined,
      );

      await expect(
        service.findMyOrder(3, 10),
      ).rejects.toThrow(NotFoundException);

      expect(
        orderItemsRepository.findByOrderId,
      ).not.toHaveBeenCalled();
    });
  });
  describe('checkout', () => {
    it('should reject checkout when a pending order already exists', async () => {
      ordersRepository.findPendingByUserId.mockResolvedValue({
        id: 20,
        userId: 2,
        status: 'pending',
      });

      cartRepository.findByUserId.mockResolvedValue({
            id: 5,
            userId: 2,
            checkoutLockedAt: null,
      });

      await expect(
        service.checkout(2),
      ).rejects.toThrow(ConflictException);

      expect(
        productsRepository.decrementStockIfAvailable,
      ).not.toHaveBeenCalled();

      expect(paymentService.createPayment).not.toHaveBeenCalled();
    });

    it('should reject checkout when stock is insufficient', async () => {
      ordersRepository.findPendingByUserId.mockResolvedValue(
        undefined,
      );

      cartRepository.findByUserId.mockResolvedValue({
        id: 5,
        userId: 2,
        checkoutLockedAt: null,
      });

      cartRepository.lockForCheckout.mockResolvedValue({
        id: 5,
        userId: 2,
        checkoutLockedAt: new Date(),
      });

      cartItemsRepository.findByCartId.mockResolvedValue([
        {
          id: 1,
          cartId: 5,
          productId: 10,
          quantity: 2,
        },
      ]);

      productsRepository.decrementStockIfAvailable.mockResolvedValue(
        undefined,
      );

      await expect(
        service.checkout(2),
      ).rejects.toThrow();

      expect(
        paymentService.createPayment,
      ).not.toHaveBeenCalled();

      expect(ordersRepository.create).not.toHaveBeenCalled();
    });

    it('should create a pending order and payment', async () => {
      ordersRepository.findPendingByUserId.mockResolvedValue(
        undefined,
      );

      cartRepository.findByUserId.mockResolvedValue({
        id: 5,
        userId: 2,
        checkoutLockedAt: null,
      });

      cartRepository.lockForCheckout.mockResolvedValue({
        id: 5,
        userId: 2,
        checkoutLockedAt: new Date(),
      });

      cartItemsRepository.findByCartId.mockResolvedValue([
        {
          id: 1,
          cartId: 5,
          productId: 10,
          quantity: 2,
        },
      ]);

      productsRepository.decrementStockIfAvailable.mockResolvedValue(
        {
          id: 10,
          name: 'RTX 5070',
          model: 'Gaming OC',
          price: '100.00',
        },
      );

      ordersRepository.create.mockResolvedValue({
        id: 30,
        userId: 2,
        status: 'pending',
        total: '200.00',
      });

      orderItemsRepository.createMany.mockResolvedValue([]);

      paymentService.createPayment.mockResolvedValue({
        providerPaymentId: 'pi_test_123',
        clientSecret: 'pi_test_123_secret',
      });

      paymentsRepository.create.mockResolvedValue({
        id: 40,
        orderId: 30,
        provider: 'stripe',
        providerPaymentId: 'pi_test_123',
        status: 'pending',
        amount: 20000,
        currency: 'EUR',
      });

      const result = await service.checkout(2);

      expect(ordersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 2,
          status: 'pending',
          total: '200.00',
        }),
        tx,
      );

      expect(
        orderItemsRepository.createMany,
      ).toHaveBeenCalledWith(
        [
          {
            orderId: 30,
            productId: 10,
            productName: 'RTX 5070',
            productModel: 'Gaming OC',
            quantity: 2,
            unitPrice: '100.00',
          },
        ],
        tx,
      );

      expect(
        paymentService.createPayment,
      ).toHaveBeenCalledWith(
        'stripe',
        20000,
        'eur',
        {
          orderId: '30',
          userId: '2',
        },
      );

      expect(paymentsRepository.create).toHaveBeenCalledWith({
        orderId: 30,
        provider: 'stripe',
        providerPaymentId: 'pi_test_123',
        status: 'pending',
        amount: 20000,
        currency: 'EUR',
      });

      expect(result).toEqual({
        orderId: 30,
        paymentId: 40,
        provider: 'stripe',
        clientSecret: 'pi_test_123_secret',
      });
    });
    it('should reject checkout when the cart is already locked', async () => {
        cartRepository.findByUserId.mockResolvedValue({
            id: 5,
            userId: 2,
            checkoutLockedAt: null,
        });

        cartRepository.lockForCheckout.mockResolvedValue(undefined);

        await expect(
            service.checkout(2),
        ).rejects.toThrow(ConflictException);

        expect(
            cartItemsRepository.findByCartId,
        ).not.toHaveBeenCalled();

        expect(
            productsRepository.decrementStockIfAvailable,
        ).not.toHaveBeenCalled();

        expect(
            ordersRepository.create,
        ).not.toHaveBeenCalled();

        expect(
            paymentService.createPayment,
        ).not.toHaveBeenCalled();
    });
    it('should reject checkout when the cart has no items', async () => {
        cartRepository.findByUserId.mockResolvedValue({
            id: 5,
            userId: 2,
            checkoutLockedAt: null,
        });

        cartRepository.lockForCheckout.mockResolvedValue({
            id: 5,
            userId: 2,
            checkoutLockedAt: new Date(),
        });

        cartItemsRepository.findByCartId.mockResolvedValue([]);

        await expect(
            service.checkout(2),
        ).rejects.toThrow(BadRequestException);

        expect(
            ordersRepository.findPendingByUserId,
        ).not.toHaveBeenCalled();

        expect(
            productsRepository.decrementStockIfAvailable,
        ).not.toHaveBeenCalled();

        expect(
            ordersRepository.create,
        ).not.toHaveBeenCalled();

        expect(
            paymentService.createPayment,
        ).not.toHaveBeenCalled();
    });
    it('should reject checkout when the cart has no items', async () => {
        cartRepository.findByUserId.mockResolvedValue({
            id: 5,
            userId: 2,
            checkoutLockedAt: null,
        });

        cartRepository.lockForCheckout.mockResolvedValue({
            id: 5,
            userId: 2,
            checkoutLockedAt: new Date(),
        });

        cartItemsRepository.findByCartId.mockResolvedValue([]);

        await expect(
            service.checkout(2),
        ).rejects.toThrow(BadRequestException);

        expect(
            ordersRepository.findPendingByUserId,
        ).not.toHaveBeenCalled();

        expect(
            productsRepository.decrementStockIfAvailable,
        ).not.toHaveBeenCalled();

        expect(
            ordersRepository.create,
        ).not.toHaveBeenCalled();

        expect(
            paymentService.createPayment,
        ).not.toHaveBeenCalled();
    });
  });
  describe('confirmPayment', () => {
    it('should reject when the order ID is invalid', async () => {
        await expect(
        service.confirmPayment({
            provider: 'stripe',
            providerPaymentId: 'pi_test_123',
            orderId: 'abc',
            amount: 20000,
            currency: 'EUR',
        }),
        ).rejects.toThrow(BadRequestException);

        expect(db.transaction).not.toHaveBeenCalled();
    });
    it('should reject when the payment does not exist', async () => {
        paymentsRepository.findByProviderPaymentId.mockResolvedValue(
            undefined,
        );

        await expect(
            service.confirmPayment({
            provider: 'stripe',
            providerPaymentId: 'pi_test_123',
            orderId: '30',
            amount: 20000,
            currency: 'EUR',
            }),
        ).rejects.toThrow(NotFoundException);

        expect(
            paymentsRepository.findByProviderPaymentId,
        ).toHaveBeenCalledWith(
            'stripe',
            'pi_test_123',
            tx,
        );

        expect(
            ordersRepository.findById,
        ).not.toHaveBeenCalled();

        expect(
            paymentsRepository.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
            ordersRepository.updateStatus,
        ).not.toHaveBeenCalled();
    });
    it('should reject when the payment amount does not match', async () => {
        paymentsRepository.findByProviderPaymentId.mockResolvedValue({
            id: 40,
            orderId: 30,
            provider: 'stripe',
            providerPaymentId: 'pi_test_123',
            status: 'pending',
            amount: 20000,
            currency: 'EUR',
        });

        await expect(
            service.confirmPayment({
            provider: 'stripe',
            providerPaymentId: 'pi_test_123',
            orderId: '30',
            amount: 15000,
            currency: 'EUR',
            }),
        ).rejects.toThrow(BadRequestException);

        expect(
            ordersRepository.findById,
        ).not.toHaveBeenCalled();

        expect(
            paymentsRepository.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
            ordersRepository.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
            cartItemsRepository.removeByCartId,
        ).not.toHaveBeenCalled();

        expect(
            cartRepository.unlockCheckout,
        ).not.toHaveBeenCalled();
    });
    it('should reject when the payment is not pending', async () => {
        paymentsRepository.findByProviderPaymentId.mockResolvedValue({
            id: 40,
            orderId: 30,
            provider: 'stripe',
            providerPaymentId: 'pi_test_123',
            status: 'succeeded',
            amount: 20000,
            currency: 'EUR',
        });

        await expect(
            service.confirmPayment({
            provider: 'stripe',
            providerPaymentId: 'pi_test_123',
            orderId: '30',
            amount: 20000,
            currency: 'EUR',
            }),
        ).rejects.toThrow(BadRequestException);

        expect(
            ordersRepository.findById,
        ).not.toHaveBeenCalled();

        expect(
            paymentsRepository.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
            ordersRepository.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
            cartItemsRepository.removeByCartId,
        ).not.toHaveBeenCalled();

        expect(
            cartRepository.unlockCheckout,
        ).not.toHaveBeenCalled();
    });
    it('should reject when the order does not exist', async () => {
        paymentsRepository.findByProviderPaymentId.mockResolvedValue({
            id: 40,
            orderId: 30,
            provider: 'stripe',
            providerPaymentId: 'pi_test_123',
            status: 'pending',
            amount: 20000,
            currency: 'EUR',
        });

        ordersRepository.findById.mockResolvedValue(undefined);

        await expect(
            service.confirmPayment({
            provider: 'stripe',
            providerPaymentId: 'pi_test_123',
            orderId: '30',
            amount: 20000,
            currency: 'EUR',
            }),
        ).rejects.toThrow(NotFoundException);

        expect(
            ordersRepository.findById,
        ).toHaveBeenCalledWith(30, tx);

        expect(
            paymentsRepository.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
            ordersRepository.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
            cartItemsRepository.removeByCartId,
        ).not.toHaveBeenCalled();

        expect(
            cartRepository.unlockCheckout,
        ).not.toHaveBeenCalled();
    });
    it('should reject when the payment does not belong to the order', async () => {
        paymentsRepository.findByProviderPaymentId.mockResolvedValue({
            id: 40,
            orderId: 30,
            provider: 'stripe',
            providerPaymentId: 'pi_test_123',
            status: 'pending',
            amount: 20000,
            currency: 'EUR',
        });

        ordersRepository.findById.mockResolvedValue({
            id: 30,
            userId: 2,
            status: 'pending',
            total: '200.00',
        });

        await expect(
            service.confirmPayment({
            provider: 'stripe',
            providerPaymentId: 'pi_test_123',
            orderId: '99',
            amount: 20000,
            currency: 'EUR',
            }),
        ).rejects.toThrow(BadRequestException);

        expect(
            ordersRepository.findById,
        ).toHaveBeenCalledWith(30, tx);

        expect(
            paymentsRepository.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
            ordersRepository.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
            cartItemsRepository.removeByCartId,
        ).not.toHaveBeenCalled();

        expect(
            cartRepository.unlockCheckout,
        ).not.toHaveBeenCalled();
    });
    it('should do nothing when the order is no longer pending', async () => {
        paymentsRepository.findByProviderPaymentId.mockResolvedValue({
            id: 40,
            orderId: 30,
            provider: 'stripe',
            providerPaymentId: 'pi_test_123',
            status: 'pending',
            amount: 20000,
            currency: 'EUR',
        });

        ordersRepository.findById.mockResolvedValue({
            id: 30,
            userId: 2,
            status: 'confirmed',
            total: '200.00',
        });

        await service.confirmPayment({
            provider: 'stripe',
            providerPaymentId: 'pi_test_123',
            orderId: '30',
            amount: 20000,
            currency: 'EUR',
        });

        expect(
            paymentsRepository.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
            ordersRepository.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
            cartItemsRepository.removeByCartId,
        ).not.toHaveBeenCalled();

        expect(
            cartRepository.unlockCheckout,
        ).not.toHaveBeenCalled();
    });
    it('should confirm the payment and order and clear the cart', async () => {
        paymentsRepository.findByProviderPaymentId.mockResolvedValue({
            id: 40,
            orderId: 30,
            provider: 'stripe',
            providerPaymentId: 'pi_test_123',
            status: 'pending',
            amount: 20000,
            currency: 'EUR',
        });

        ordersRepository.findById.mockResolvedValue({
            id: 30,
            userId: 2,
            status: 'pending',
            total: '200.00',
        });

        cartRepository.findByUserId.mockResolvedValue({
            id: 5,
            userId: 2,
            checkoutLockedAt: new Date(),
        });

        await service.confirmPayment({
            provider: 'stripe',
            providerPaymentId: 'pi_test_123',
            orderId: '30',
            amount: 20000,
            currency: 'EUR',
        });

        expect(
            paymentsRepository.updateStatus,
        ).toHaveBeenCalledWith(
            40,
            'succeeded',
            tx,
        );

        expect(
            ordersRepository.updateStatus,
        ).toHaveBeenCalledWith(
            30,
            'confirmed',
            tx,
        );

        expect(
            cartRepository.findByUserId,
        ).toHaveBeenCalledWith(
            2,
            tx,
        );

        expect(
            cartItemsRepository.removeByCartId,
        ).toHaveBeenCalledWith(
            5,
            tx,
        );

        expect(
            cartRepository.unlockCheckout,
        ).toHaveBeenCalledWith(
            5,
            tx,
        );
    });
  });
  describe('cancelPayment', () => {
    it('should reject when the order ID is invalid', async () => {
        await expect(
        service.cancelPayment({
            provider: 'stripe',
            providerPaymentId: 'pi_test_123',
            orderId: 'abc',
            amount: 20000,
            currency: 'EUR',
        }),
        ).rejects.toThrow(BadRequestException);

        expect(db.transaction).not.toHaveBeenCalled();
    });
    it('should reject when the payment does not exist', async () => {
        paymentsRepository.findByProviderPaymentId.mockResolvedValue(
            undefined,
        );

        await expect(
            service.cancelPayment({
            provider: 'stripe',
            providerPaymentId: 'pi_test_123',
            orderId: '30',
            amount: 20000,
            currency: 'EUR',
            }),
        ).rejects.toThrow(NotFoundException);

        expect(
            paymentsRepository.findByProviderPaymentId,
        ).toHaveBeenCalledWith(
            'stripe',
            'pi_test_123',
            tx,
        );

        expect(
            productsRepository.incrementStock,
        ).not.toHaveBeenCalled();

        expect(
            paymentsRepository.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
            ordersRepository.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
            cartRepository.unlockCheckout,
        ).not.toHaveBeenCalled();
    });
    it('should do nothing when the payment is no longer pending', async () => {
        paymentsRepository.findByProviderPaymentId.mockResolvedValue({
            id: 40,
            orderId: 30,
            provider: 'stripe',
            providerPaymentId: 'pi_test_123',
            status: 'failed',
            amount: 20000,
            currency: 'EUR',
        });

        await service.cancelPayment({
            provider: 'stripe',
            providerPaymentId: 'pi_test_123',
            orderId: '30',
            amount: 20000,
            currency: 'EUR',
        });

        expect(
            ordersRepository.findById,
        ).not.toHaveBeenCalled();

        expect(
            productsRepository.incrementStock,
        ).not.toHaveBeenCalled();

        expect(
            paymentsRepository.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
            ordersRepository.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
            cartRepository.unlockCheckout,
        ).not.toHaveBeenCalled();
    });
    it('should reject when the payment amount does not match', async () => {
        paymentsRepository.findByProviderPaymentId.mockResolvedValue({
            id: 40,
            orderId: 30,
            provider: 'stripe',
            providerPaymentId: 'pi_test_123',
            status: 'pending',
            amount: 20000,
            currency: 'EUR',
        });

        await expect(
            service.cancelPayment({
            provider: 'stripe',
            providerPaymentId: 'pi_test_123',
            orderId: '30',
            amount: 15000,
            currency: 'EUR',
            }),
        ).rejects.toThrow(BadRequestException);

        expect(
            ordersRepository.findById,
        ).not.toHaveBeenCalled();

        expect(
            productsRepository.incrementStock,
        ).not.toHaveBeenCalled();

        expect(
            paymentsRepository.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
            ordersRepository.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
            cartRepository.unlockCheckout,
        ).not.toHaveBeenCalled();
    });
    it('should reject when the order does not exist', async () => {
        paymentsRepository.findByProviderPaymentId.mockResolvedValue({
            id: 40,
            orderId: 30,
            provider: 'stripe',
            providerPaymentId: 'pi_test_123',
            status: 'pending',
            amount: 20000,
            currency: 'EUR',
        });

        ordersRepository.findById.mockResolvedValue(undefined);

        await expect(
            service.cancelPayment({
            provider: 'stripe',
            providerPaymentId: 'pi_test_123',
            orderId: '30',
            amount: 20000,
            currency: 'EUR',
            }),
        ).rejects.toThrow(NotFoundException);

        expect(
            ordersRepository.findById,
        ).toHaveBeenCalledWith(30, tx);

        expect(
            productsRepository.incrementStock,
        ).not.toHaveBeenCalled();

        expect(
            paymentsRepository.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
            ordersRepository.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
            cartRepository.unlockCheckout,
        ).not.toHaveBeenCalled();
    });
    it('should reject when the payment does not belong to the order', async () => {
        paymentsRepository.findByProviderPaymentId.mockResolvedValue({
            id: 40,
            orderId: 30,
            provider: 'stripe',
            providerPaymentId: 'pi_test_123',
            status: 'pending',
            amount: 20000,
            currency: 'EUR',
        });

        ordersRepository.findById.mockResolvedValue({
            id: 30,
            userId: 2,
            status: 'pending',
            total: '200.00',
        });

        await expect(
            service.cancelPayment({
            provider: 'stripe',
            providerPaymentId: 'pi_test_123',
            orderId: '99',
            amount: 20000,
            currency: 'EUR',
            }),
        ).rejects.toThrow(BadRequestException);

        expect(
            ordersRepository.findById,
        ).toHaveBeenCalledWith(30, tx);

        expect(
            productsRepository.incrementStock,
        ).not.toHaveBeenCalled();

        expect(
            paymentsRepository.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
            ordersRepository.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
            cartRepository.unlockCheckout,
        ).not.toHaveBeenCalled();
    });
    it('should reject when the order is not pending', async () => {
        paymentsRepository.findByProviderPaymentId.mockResolvedValue({
            id: 40,
            orderId: 30,
            provider: 'stripe',
            providerPaymentId: 'pi_test_123',
            status: 'pending',
            amount: 20000,
            currency: 'EUR',
        });

        ordersRepository.findById.mockResolvedValue({
            id: 30,
            userId: 2,
            status: 'confirmed',
            total: '200.00',
        });

        await expect(
            service.cancelPayment({
            provider: 'stripe',
            providerPaymentId: 'pi_test_123',
            orderId: '30',
            amount: 20000,
            currency: 'EUR',
            }),
        ).rejects.toThrow(BadRequestException);

        expect(
            productsRepository.incrementStock,
        ).not.toHaveBeenCalled();

        expect(
            paymentsRepository.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
            ordersRepository.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
            cartRepository.unlockCheckout,
        ).not.toHaveBeenCalled();
    });
    it('should cancel the payment and order and restore stock', async () => {
        paymentsRepository.findByProviderPaymentId.mockResolvedValue({
            id: 40,
            orderId: 30,
            provider: 'stripe',
            providerPaymentId: 'pi_test_123',
            status: 'pending',
            amount: 30000,
            currency: 'EUR',
        });

        ordersRepository.findById.mockResolvedValue({
            id: 30,
            userId: 2,
            status: 'pending',
            total: '300.00',
        });

        orderItemsRepository.findByOrderId.mockResolvedValue([
            {
            id: 1,
            orderId: 30,
            productId: 10,
            quantity: 2,
            unitPrice: '100.00',
            },
            {
            id: 2,
            orderId: 30,
            productId: 20,
            quantity: 1,
            unitPrice: '100.00',
            },
        ]);

        cartRepository.findByUserId.mockResolvedValue({
            id: 5,
            userId: 2,
            checkoutLockedAt: new Date(),
        });

        await service.cancelPayment({
            provider: 'stripe',
            providerPaymentId: 'pi_test_123',
            orderId: '30',
            amount: 30000,
            currency: 'EUR',
        });

        expect(
            productsRepository.incrementStock,
        ).toHaveBeenNthCalledWith(
            1,
            10,
            2,
            tx,
        );

        expect(
            productsRepository.incrementStock,
        ).toHaveBeenNthCalledWith(
            2,
            20,
            1,
            tx,
        );

        expect(
            cartRepository.findByUserId,
        ).toHaveBeenCalledWith(
            2,
            tx,
        );

        expect(
            cartRepository.unlockCheckout,
        ).toHaveBeenCalledWith(
            5,
            tx,
        );

        expect(
            paymentsRepository.updateStatus,
        ).toHaveBeenCalledWith(
            40,
            'failed',
            tx,
        );

        expect(
            ordersRepository.updateStatus,
        ).toHaveBeenCalledWith(
            30,
            'cancelled',
            tx,
        );
    });
  });
  describe('cancelExpiredCheckout', () => {
    it('should do nothing when the order does not exist', async () => {
        ordersRepository.findById.mockResolvedValue(undefined);

        await service.cancelExpiredCheckout(30);

        expect(
        ordersRepository.findById,
        ).toHaveBeenCalledWith(30, tx);

        expect(
        paymentsRepository.findByOrderId,
        ).not.toHaveBeenCalled();

        expect(
        orderItemsRepository.findByOrderId,
        ).not.toHaveBeenCalled();

        expect(
        productsRepository.incrementStock,
        ).not.toHaveBeenCalled();

        expect(
        paymentsRepository.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
        ordersRepository.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
        cartRepository.unlockCheckout,
        ).not.toHaveBeenCalled();
    });
    it('should do nothing when the order is not pending', async () => {
        ordersRepository.findById.mockResolvedValue({
            id: 30,
            userId: 2,
            status: 'confirmed',
            total: '200.00',
        });

        await service.cancelExpiredCheckout(30);

        expect(
            paymentsRepository.findByOrderId,
        ).not.toHaveBeenCalled();

        expect(
            orderItemsRepository.findByOrderId,
        ).not.toHaveBeenCalled();

        expect(
            productsRepository.incrementStock,
        ).not.toHaveBeenCalled();

        expect(
            paymentsRepository.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
            ordersRepository.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
            cartRepository.unlockCheckout,
        ).not.toHaveBeenCalled();
    });
    it('should do nothing when the payment does not exist', async () => {
        ordersRepository.findById.mockResolvedValue({
            id: 30,
            userId: 2,
            status: 'pending',
            total: '200.00',
        });

        paymentsRepository.findByOrderId.mockResolvedValue(undefined);

        await service.cancelExpiredCheckout(30);

        expect(
            paymentsRepository.findByOrderId,
        ).toHaveBeenCalledWith(30, tx);

        expect(
            orderItemsRepository.findByOrderId,
        ).not.toHaveBeenCalled();

        expect(
            productsRepository.incrementStock,
        ).not.toHaveBeenCalled();

        expect(
            paymentsRepository.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
            ordersRepository.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
            cartRepository.unlockCheckout,
        ).not.toHaveBeenCalled();
    });
    it('should do nothing when the payment is not pending', async () => {
        ordersRepository.findById.mockResolvedValue({
            id: 30,
            userId: 2,
            status: 'pending',
            total: '200.00',
        });

        paymentsRepository.findByOrderId.mockResolvedValue({
            id: 40,
            orderId: 30,
            status: 'cancelled',
            amount: 20000,
            currency: 'EUR',
        });

        await service.cancelExpiredCheckout(30);

        expect(
            orderItemsRepository.findByOrderId,
        ).not.toHaveBeenCalled();

        expect(
            productsRepository.incrementStock,
        ).not.toHaveBeenCalled();

        expect(
            paymentsRepository.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
            ordersRepository.updateStatus,
        ).not.toHaveBeenCalled();

        expect(
            cartRepository.unlockCheckout,
        ).not.toHaveBeenCalled();
    });
    it('should cancel an expired checkout and restore stock', async () => {
        ordersRepository.findById.mockResolvedValue({
            id: 30,
            userId: 2,
            status: 'pending',
            total: '300.00',
        });

        paymentsRepository.findByOrderId.mockResolvedValue({
            id: 40,
            orderId: 30,
            status: 'pending',
            amount: 30000,
            currency: 'EUR',
        });

        orderItemsRepository.findByOrderId.mockResolvedValue([
            {
            id: 1,
            orderId: 30,
            productId: 10,
            quantity: 2,
            unitPrice: '100.00',
            },
            {
            id: 2,
            orderId: 30,
            productId: 20,
            quantity: 1,
            unitPrice: '100.00',
            },
        ]);

        cartRepository.findByUserId.mockResolvedValue({
            id: 5,
            userId: 2,
            checkoutLockedAt: new Date(),
        });

        await service.cancelExpiredCheckout(30);

        expect(
            productsRepository.incrementStock,
        ).toHaveBeenNthCalledWith(
            1,
            10,
            2,
            tx,
        );

        expect(
            productsRepository.incrementStock,
        ).toHaveBeenNthCalledWith(
            2,
            20,
            1,
            tx,
        );

        expect(
            paymentsRepository.updateStatus,
        ).toHaveBeenCalledWith(
            40,
            'cancelled',
            tx,
        );

        expect(
            ordersRepository.updateStatus,
        ).toHaveBeenCalledWith(
            30,
            'cancelled',
            tx,
        );

        expect(
            cartRepository.findByUserId,
        ).toHaveBeenCalledWith(
            2,
            tx,
        );

        expect(
            cartRepository.unlockCheckout,
        ).toHaveBeenCalledWith(
            5,
            tx,
        );
    });
    it('should cancel an expired checkout even when the cart does not exist', async () => {
        ordersRepository.findById.mockResolvedValue({
            id: 30,
            userId: 2,
            status: 'pending',
            total: '200.00',
        });

        paymentsRepository.findByOrderId.mockResolvedValue({
            id: 40,
            orderId: 30,
            status: 'pending',
            amount: 20000,
            currency: 'EUR',
        });

        orderItemsRepository.findByOrderId.mockResolvedValue([
            {
            id: 1,
            orderId: 30,
            productId: 10,
            quantity: 2,
            unitPrice: '100.00',
            },
        ]);

        cartRepository.findByUserId.mockResolvedValue(undefined);

        await service.cancelExpiredCheckout(30);

        expect(
            productsRepository.incrementStock,
        ).toHaveBeenCalledWith(
            10,
            2,
            tx,
        );

        expect(
            paymentsRepository.updateStatus,
        ).toHaveBeenCalledWith(
            40,
            'cancelled',
            tx,
        );

        expect(
            ordersRepository.updateStatus,
        ).toHaveBeenCalledWith(
            30,
            'cancelled',
            tx,
        );

        expect(
            cartRepository.findByUserId,
        ).toHaveBeenCalledWith(
            2,
            tx,
        );

        expect(
            cartRepository.unlockCheckout,
        ).not.toHaveBeenCalled();
    });
  });
  describe('findMyOrders', () => {
    it('should return an empty array when the user has no orders', async () => {
        ordersRepository.findByUserId.mockResolvedValue([]);

        const result = await service.findMyOrders(2);

        expect(
        ordersRepository.findByUserId,
        ).toHaveBeenCalledWith(2);

        expect(
        orderItemsRepository.findByOrderId,
        ).not.toHaveBeenCalled();

        expect(result).toEqual([]);
    });

    it('should return the user orders with their items', async () => {
        ordersRepository.findByUserId.mockResolvedValue([
        {
            id: 30,
            userId: 2,
            status: 'confirmed',
            total: '200.00',
        },
        ]);

        orderItemsRepository.findByOrderId.mockResolvedValue([
        {
            id: 1,
            orderId: 30,
            productId: 10,
            quantity: 2,
            unitPrice: '100.00',
        },
        ]);

        const result = await service.findMyOrders(2);

        expect(
        ordersRepository.findByUserId,
        ).toHaveBeenCalledWith(2);

        expect(
        orderItemsRepository.findByOrderId,
        ).toHaveBeenCalledWith(30);

        expect(result).toEqual([
        {
            id: 30,
            userId: 2,
            status: 'confirmed',
            total: '200.00',
            items: [
            {
                id: 1,
                orderId: 30,
                productId: 10,
                quantity: 2,
                unitPrice: '100.00',
            },
            ],
        },
        ]);
    });

    it('should return multiple orders with their respective items', async () => {
        ordersRepository.findByUserId.mockResolvedValue([
        {
            id: 30,
            userId: 2,
            status: 'confirmed',
            total: '200.00',
        },
        {
            id: 31,
            userId: 2,
            status: 'cancelled',
            total: '100.00',
        },
        ]);

        orderItemsRepository.findByOrderId
        .mockResolvedValueOnce([
            {
            id: 1,
            orderId: 30,
            productId: 10,
            quantity: 2,
            unitPrice: '100.00',
            },
        ])
        .mockResolvedValueOnce([
            {
            id: 2,
            orderId: 31,
            productId: 20,
            quantity: 1,
            unitPrice: '100.00',
            },
        ]);

        const result = await service.findMyOrders(2);

        expect(
        ordersRepository.findByUserId,
        ).toHaveBeenCalledWith(2);

        expect(
        orderItemsRepository.findByOrderId,
        ).toHaveBeenNthCalledWith(1, 30);

        expect(
        orderItemsRepository.findByOrderId,
        ).toHaveBeenNthCalledWith(2, 31);

        expect(result).toEqual([
        {
            id: 30,
            userId: 2,
            status: 'confirmed',
            total: '200.00',
            items: [
            {
                id: 1,
                orderId: 30,
                productId: 10,
                quantity: 2,
                unitPrice: '100.00',
            },
            ],
        },
        {
            id: 31,
            userId: 2,
            status: 'cancelled',
            total: '100.00',
            items: [
            {
                id: 2,
                orderId: 31,
                productId: 20,
                quantity: 1,
                unitPrice: '100.00',
            },
            ],
        },
        ]);
    });
  });
});