import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLString,
  GraphQLObjectType,
  GraphQLList,
  GraphQLInt,
  GraphQLInputObjectType,
  GraphQLEnumType
} from 'graphql'

import {Author, AuthorSort} from '../db/author'
import {Context} from '../context'

import {GraphQLPageInfo} from './common'
import {GraphQLImage} from './image'
import {GraphQLSlug} from './slug'
import {GraphQLRichText} from './richText'
import {GraphQLDateTime} from 'graphql-iso-date'
import {createProxyingResolver} from '../utility'

export const GraphQLAuthorLink = new GraphQLObjectType<Author, Context>({
  name: 'AuthorLink',
  fields: {
    title: {type: GraphQLNonNull(GraphQLString)},
    url: {type: GraphQLNonNull(GraphQLString)}
  }
})

export const GraphQLAuthorUsers = new GraphQLObjectType({
  name: 'AuthorUsers',
  fields: {
    id: {type: GraphQLNonNull(GraphQLString)},
    name: {type: GraphQLNonNull(GraphQLString)},
    email: {type: GraphQLNonNull(GraphQLString)}
  }
})

export const GraphQLAuthor = new GraphQLObjectType<Author, Context>({
  name: 'Author',
  fields: {
    id: {type: GraphQLNonNull(GraphQLID)},

    createdAt: {type: GraphQLNonNull(GraphQLDateTime)},
    modifiedAt: {type: GraphQLNonNull(GraphQLDateTime)},

    name: {type: GraphQLNonNull(GraphQLString)},
    slug: {type: GraphQLNonNull(GraphQLSlug)},
    url: {
      type: GraphQLNonNull(GraphQLString),
      resolve: createProxyingResolver((author, {}, {urlAdapter}) => {
        return urlAdapter.getAuthorURL(author)
      })
    },
    links: {type: GraphQLList(GraphQLNonNull(GraphQLAuthorLink))},
    bio: {type: GraphQLRichText},
    jobTitle: {type: GraphQLString},
    image: {
      type: GraphQLImage,
      resolve: createProxyingResolver(({imageID}, args, {loaders}) => {
        return imageID ? loaders.images.load(imageID) : null
      })
    },
    users: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(GraphQLAuthorUsers))),
      resolve: createProxyingResolver(({id}, args, {dbAdapter}) => {
        return id ? dbAdapter.user.getUsersByAuthorID(id) : []
      })
    }
  }
})

export const GraphQLAuthorFilter = new GraphQLInputObjectType({
  name: 'AuthorFilter',
  fields: {
    name: {type: GraphQLString}
  }
})

export const GraphQLAuthorSort = new GraphQLEnumType({
  name: 'AuthorSort',
  values: {
    CREATED_AT: {value: AuthorSort.CreatedAt},
    MODIFIED_AT: {value: AuthorSort.ModifiedAt},
    NAME: {value: AuthorSort.Name}
  }
})

export const GraphQLAuthorConnection = new GraphQLObjectType<any, Context>({
  name: 'AuthorConnection',
  fields: {
    nodes: {type: GraphQLNonNull(GraphQLList(GraphQLNonNull(GraphQLAuthor)))},
    pageInfo: {type: GraphQLNonNull(GraphQLPageInfo)},
    totalCount: {type: GraphQLNonNull(GraphQLInt)}
  }
})

export const GraphQLAuthorLinkInput = new GraphQLInputObjectType({
  name: 'AuthorLinkInput',
  fields: {
    title: {type: GraphQLNonNull(GraphQLString)},
    url: {type: GraphQLNonNull(GraphQLString)}
  }
})

export const GraphQLAuthorInput = new GraphQLInputObjectType({
  name: 'AuthorInput',
  fields: {
    name: {type: GraphQLNonNull(GraphQLString)},
    slug: {type: GraphQLNonNull(GraphQLSlug)},
    links: {type: GraphQLList(GraphQLNonNull(GraphQLAuthorLinkInput))},
    bio: {type: GraphQLRichText},
    jobTitle: {type: GraphQLString},
    imageID: {type: GraphQLID}
  }
})
