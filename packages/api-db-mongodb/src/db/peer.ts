import {
  DBPeerAdapter,
  PeerProfile,
  OptionalPeer,
  Peer,
  PeerProfileInput,
  UpdatePeerInput,
  CreatePeerInput
} from '@tsri-wepublish/api'

import {Collection, Db} from 'mongodb'

import {CollectionName, DBPeerProfile, DBPeer} from './schema'

export class MongoDBPeerAdapter implements DBPeerAdapter {
  private peerProfiles: Collection<DBPeerProfile>
  private peers: Collection<DBPeer>

  constructor(db: Db) {
    this.peerProfiles = db.collection(CollectionName.PeerProfiles)
    this.peers = db.collection(CollectionName.Peers)
  }

  async getPeerProfile(): Promise<PeerProfile> {
    const value = await this.peerProfiles.findOne({})

    if (!value) {
      return {
        name: '',
        themeColor: '#000000',
        themeFontColor: '#ffffff',
        callToActionURL: '',
        callToActionText: [],
        callToActionImageID: '',
        callToActionImageURL: ''
      }
    }

    return value
  }

  async updatePeerProfile(input: PeerProfileInput): Promise<PeerProfile> {
    const {value} = await this.peerProfiles.findOneAndUpdate(
      {},
      {
        $set: {
          name: input.name,
          logoID: input.logoID,
          themeColor: input.themeColor,
          themeFontColor: input.themeFontColor,
          callToActionURL: input.callToActionURL,
          callToActionText: input.callToActionText,
          callToActionImageID: input.callToActionImageID,
          callToActionImageURL: input.callToActionImageURL
        }
      },
      {
        upsert: true,
        returnOriginal: false
      }
    )

    return value!
  }

  async createPeer({name, slug, hostURL, token}: CreatePeerInput): Promise<Peer> {
    const {ops} = await this.peers.insertOne({
      createdAt: new Date(),
      modifiedAt: new Date(),
      slug,
      name,
      token,
      hostURL,
      isDisabled: false
    })

    const {_id: id, ...data} = ops[0]
    return {id, ...data}
  }

  async updatePeer(
    id: string,
    {hostURL, name, slug, token, isDisabled}: UpdatePeerInput
  ): Promise<OptionalPeer> {
    const toUpdate = {
      modifiedAt: new Date()
    } as Record<string, unknown>
    if (hostURL) toUpdate.hostUrl = hostURL
    if (name) toUpdate.name = name
    if (slug) toUpdate.slug = slug
    token ? (toUpdate.token = token) : (toUpdate.token = '$token')
    if (isDisabled !== undefined) toUpdate.isDisabled = isDisabled

    const {value} = await this.peers.findOneAndUpdate(
      {_id: id},
      [
        {
          $set: toUpdate
        }
      ] as any,
      {returnOriginal: false}
    )

    if (!value) return null

    const {_id: outID, ...data} = value
    return {id: outID, ...data}
  }

  async deletePeer(id: string): Promise<string | null> {
    const {deletedCount} = await this.peers.deleteOne({_id: id})
    return deletedCount !== 0 ? id : null
  }

  async getPeersByID(ids: readonly string[]): Promise<OptionalPeer[]> {
    const peers = await this.peers.find({_id: {$in: ids}}).toArray()
    const peerMap = Object.fromEntries(peers.map(({_id: id, ...peer}) => [id, {id, ...peer}]))

    return ids.map(id => peerMap[id] ?? null)
  }

  async getPeersBySlug(slugs: readonly string[]): Promise<OptionalPeer[]> {
    const peers = await this.peers.find({slug: {$in: slugs as string[]}}).toArray()
    const peerMap = Object.fromEntries(
      peers.map(({_id: id, slug, ...peer}) => [slug, {id, slug, ...peer!}])
    )

    return slugs.map<OptionalPeer>(slug => peerMap[slug] ?? null)
  }

  async getPeers(): Promise<Peer[]> {
    const peers = await this.peers.find().sort({createdAt: -1}).toArray()
    return peers.map(({_id: id, ...data}) => ({id, ...data}))
  }
}
