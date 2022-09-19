/* eslint-disable sonarjs/no-duplicate-string */
import type { FactoryModel } from '../model.js'
import type { WithCallback } from '../contracts.js'

export class RelationshipBuilder {
  constructor(private factory: FactoryModel<any>) {}

  /**
   * Relationships to create
   */
  private appliedRelationships: { name: string; count?: number; callback?: WithCallback }[] = []

  /**
   * Keep track of models created by the belongsTo relationship
   * in order to hydrate after the main model is created.
   */
  private preModels: Record<string, any>[] = []

  /**
   * Hydrate relationships into the models before returning them to
   * the user
   */
  private hydrateRelationships(
    models: Record<string, any>[],
    type: string,
    relationship: { name: string; count?: number },
    relations: any[]
  ) {
    for (const model of models) {
      if (type === 'has-one') {
        model[relationship.name] = relations.shift()
      } else if (type === 'has-many') {
        model[relationship.name] = relations.splice(0, relationship.count || 1)
      } else if (type === 'belongs-to') {
        model[relationship.name] = relations.shift()
      }
    }
  }

  /**
   * Filter relationships by their type.
   */
  private filterRelationshipsByType(type: 'pre' | 'post') {
    return this.appliedRelationships.filter((relationship) => {
      const meta = this.factory.relations[relationship.name]!
      if (type === 'pre') {
        return meta.type === 'belongs-to'
      }

      return meta.type !== 'belongs-to'
    })
  }

  /**
   * Create post relationships ( hasOne, hasMany ), and persist them
   */
  public async createPost(models: Record<string, any>[]) {
    const relationships = this.filterRelationshipsByType('post')

    for (const relationship of relationships) {
      const { name, count, callback } = relationship
      const { factory, foreignKey, localKey, type } = this.factory.relations[name]!

      if (callback) callback(factory)

      const mergeAttributes = models.reduce<any[]>((acc, model) => {
        for (let i = 0; i < (count || 1); i++) {
          const mergeInput = factory.getMergeAttributes(i)
          acc.push({ ...mergeInput, [foreignKey]: model[localKey] })
        }
        return acc
      }, [])

      const relations = await factory
        .merge(mergeAttributes)
        .createMany((count || 1) * models.length)

      this.hydrateRelationships(models, type, relationship, relations)
    }
  }

  /**
   * Create pre relationships ( belongsTo ), and persist them
   */
  public async createPre(models: Record<string, any>[]) {
    const relationships = this.filterRelationshipsByType('pre')

    for (const relationship of relationships) {
      const { name, count, callback } = relationship
      const { factory, foreignKey, localKey } = this.factory.relations[name]!

      if (callback) callback(factory)

      const relations = await factory.createMany((count || 1) * models.length)
      models.forEach((model, index) => (model[foreignKey] = relations[index][localKey]))

      this.preModels = this.preModels.concat({
        name,
        count,
        relations,
      })
    }
  }

  /**
   * Hydrate the pre models into the main models
   */
  public postHydrate(models: Record<string, any>[]) {
    for (const { name, count, relations } of this.preModels) {
      this.hydrateRelationships(models, 'belongs-to', { name, count }, relations)
    }
    return models
  }

  /**
   * Register a relationship to be created
   */
  public apply(name: string, count?: number, callback?: WithCallback) {
    const relationship = this.factory.relations[name]

    if (!relationship) {
      throw new Error(`The relationship "${name}" does not exist on the factory`)
    }

    this.appliedRelationships.push({ name, count, callback })
  }

  /**
   * Reset the builder to its initial state.
   */
  public reset() {
    this.appliedRelationships = []
    this.preModels = []
  }
}
