import type { Builder } from './builder/builder'
import type { FactoryModel } from './model'
import type { faker } from '@faker-js/faker'
import type { Knex } from 'knex'

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>

export type CasingStrategy = 'camel' | 'snake' | 'none'

/**
 * Callback that must be passed to the `defineFactory` function.
 */
export type DefineFactoryCallback<T> = (args: { faker: typeof faker }) => {
  [K in keyof T]: T[K] | (() => T[K] | Promise<T[K]>)
}

/**
 * Callback that must be passed to the `state` function.
 */
export type DefineStateCallback<T> = (attributes: T) => Partial<T>

/**
 * The Factorio configuration.
 */
export interface FactorioConfig {
  database: Knex.Config

  /**
   * Configure the casing conversion for the database operations
   */
  casing?: {
    /**
     * Casing to which the keys will be converted before inserting into the database
     *
     * Default: `snake`
     */
    insert: CasingStrategy

    /**
     * Casing to which the keys will be converted before returning
     *
     * Default: `camel`
     */
    return: CasingStrategy
  }
}

/**
 * Extract generics from FactoryModel class
 */
export type FactoryExtractGeneric<
  Factory extends FactoryModel<any, any, any>,
  Extracted extends 'states' | 'model' | 'relationships'
> = Factory extends FactoryModel<infer Model, infer States, infer Relationships>
  ? Extracted extends 'states'
    ? States
    : Extracted extends 'model'
    ? Model
    : Extracted extends 'relationships'
    ? Relationships
    : never
  : never

/**
 * Callback that must be passed to the `with` function.
 */
export type WithCallback = (builder: Builder<any>) => void

/**
 * Possible relations type
 */
export enum RelationType {
  HasOne = 'has-one',
  HasMany = 'has-many',
  BelongsTo = 'belongs-to',
}

/**
 * Metadata for a relationship.
 */
export interface RelationshipMeta {
  type: RelationType

  /**
   * If no localKey is defined, we gonna assume that it's "id"
   */
  localKey: string

  /**
   * If no foreignKey is defined, we gonna assume that it's "{tableName}_id"
   */
  foreignKey: string

  /**
   * Reference to the relation factory
   */
  factory: () => Builder<any, any, any>
}

export type RelationshipMetaOptions = Optional<
  Omit<RelationshipMeta, 'type' | 'factory'>,
  'foreignKey' | 'localKey'
>
