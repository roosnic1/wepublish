import React, {useCallback, useEffect, useState} from 'react'

import {RouteActionType} from '@wepublish/karma.run-react'

import {BlockList, useBlockMap} from '../atoms/blockList'
import {NavigationBar} from '../atoms/navigationBar'
import {EditorTemplate} from '../atoms/editorTemplate'

import {IconButtonLink, PageEditRoute, PageListRoute, useRouteDispatch} from '../route'

import {
  PageInput,
  useCreatePageMutation,
  usePageQuery,
  usePublishPageMutation,
  useUpdatePageMutation,
  usePagePreviewLinkLazyQuery
} from '../api'

import {PageMetadata, PageMetadataPanel} from '../panel/pageMetadataPanel'
import {PublishPagePanel} from '../panel/publishPagePanel'

import {blockForQueryBlock, BlockValue, unionMapForBlock} from '../blocks/types'

import {useUnsavedChangesDialog} from '../unsavedChangesDialog'
import {BlockMap} from '../blocks/blockMap'

import {useTranslation} from 'react-i18next'
import {toaster, Message, Badge, Drawer, IconButton, Modal, Tag, Notification} from 'rsuite'
import {StateColor} from '../utility'
import ArrowLeftIcon from '@rsuite/icons/legacy/ArrowLeft'
import NewspaperOIcon from '@rsuite/icons/legacy/NewspaperO'
import SaveIcon from '@rsuite/icons/legacy/Save'
import CloudUploadIcon from '@rsuite/icons/legacy/CloudUpload'
import EyeIcon from '@rsuite/icons/legacy/Eye'

export interface PageEditorProps {
  readonly id?: string
}

export function PageEditor({id}: PageEditorProps) {
  const dispatch = useRouteDispatch()

  const [previewLinkFetch, {data}] = usePagePreviewLinkLazyQuery({
    fetchPolicy: 'no-cache'
  })

  useEffect(() => {
    if (data?.pagePreviewLink) {
      window.open(data?.pagePreviewLink)
    }
  }, [data?.pagePreviewLink])

  const [
    createPage,
    {data: createData, loading: isCreating, error: createError}
  ] = useCreatePageMutation()

  const [updatePage, {loading: isUpdating, error: updateError}] = useUpdatePageMutation({
    fetchPolicy: 'no-cache'
  })

  const [
    publishPage,
    {data: publishData, loading: isPublishing, error: publishError}
  ] = usePublishPageMutation({
    fetchPolicy: 'no-cache'
  })

  const [isMetaDrawerOpen, setMetaDrawerOpen] = useState(false)
  const [isPublishDialogOpen, setPublishDialogOpen] = useState(false)

  const [publishedAt, setPublishedAt] = useState<Date>()
  const [updatedAt, setUpdatedAt] = useState<Date>()
  const [publishAt, setPublishAt] = useState<Date>()
  const [metadata, setMetadata] = useState<PageMetadata>({
    slug: '',
    title: '',
    description: '',
    tags: [],
    url: '',
    properties: [],
    image: undefined,
    socialMediaTitle: undefined,
    socialMediaDescription: undefined,
    socialMediaImage: undefined
  })

  const isNew = id === undefined
  const [blocks, setBlocks] = useState<BlockValue[]>([])

  const pageID = id || createData?.createPage.id

  const {data: pageData, refetch, loading: isLoading} = usePageQuery({
    skip: isNew || createData != null,
    errorPolicy: 'all',
    fetchPolicy: 'no-cache',
    variables: {id: pageID!}
  })

  const {t} = useTranslation()

  const isNotFound = pageData && !pageData.page
  const isDisabled = isLoading || isCreating || isUpdating || isPublishing || isNotFound
  const pendingPublishDate = publishData?.publishPage?.pending?.publishAt
    ? new Date(publishData?.publishPage?.pending?.publishAt)
    : pageData?.page?.pending?.publishAt
    ? new Date(pageData?.page?.pending?.publishAt)
    : undefined

  const [hasChanged, setChanged] = useState(false)
  const unsavedChangesDialog = useUnsavedChangesDialog(hasChanged)

  const handleChange = useCallback((blocks: React.SetStateAction<BlockValue[]>) => {
    setBlocks(blocks)
    setChanged(true)
  }, [])

  useEffect(() => {
    if (pageData?.page) {
      const {latest, pending} = pageData.page
      const {
        slug,
        title,
        description,
        tags,
        url,
        image,
        blocks,
        properties,
        socialMediaTitle,
        socialMediaDescription,
        socialMediaImage
      } = latest
      const {publishedAt} = latest ?? {}
      if (publishedAt) setPublishedAt(new Date(publishedAt))

      const {updatedAt} = latest ?? {}
      if (updatedAt) setUpdatedAt(new Date(updatedAt))

      const {publishAt} = pending ?? latest
      if (publishAt) setPublishAt(new Date(publishAt))

      setMetadata({
        slug,
        title,
        description: description ?? '',
        tags,
        url,
        properties: properties.map(property => ({
          key: property.key,
          value: property.value,
          public: property.public
        })),
        image: image || undefined,
        socialMediaTitle: socialMediaTitle || '',
        socialMediaDescription: socialMediaDescription || '',
        socialMediaImage: socialMediaImage || undefined
      })

      setBlocks(blocks.map(blockForQueryBlock))
    }
  }, [pageData])

  const [stateColor, setStateColor] = useState<StateColor>(StateColor.none)
  const [tagTitle, setTagTitle] = useState<string>('')

  useEffect(() => {
    if (pageData?.page?.pending) {
      setStateColor(StateColor.pending)
      setTagTitle(
        t('pageEditor.overview.pending', {
          date: new Date(pageData?.page?.pending?.publishAt ?? '')
        })
      )
    } else if (pageData?.page?.published) {
      setStateColor(StateColor.published)
      setTagTitle(
        t('pageEditor.overview.published', {
          date: new Date(pageData?.page?.published?.publishedAt ?? '')
        })
      )
    } else {
      setStateColor(StateColor.draft)
      setTagTitle(t('pageEditor.overview.unpublished'))
    }
  }, [pageData, hasChanged])

  useEffect(() => {
    const error = createError?.message ?? updateError?.message ?? publishError?.message
    if (error)
      toaster.push(
        <Message type="error" showIcon closable duration={0}>
          {error}
        </Message>
      )
  }, [createError, updateError, publishError])

  function createInput(): PageInput {
    return {
      slug: metadata.slug,
      title: metadata.title,
      description: metadata.description,
      imageID: metadata.image?.id,
      tags: metadata.tags,
      properties: metadata.properties,
      socialMediaTitle: metadata.socialMediaTitle || undefined,
      socialMediaDescription: metadata.socialMediaDescription || undefined,
      socialMediaImageID: metadata.socialMediaImage?.id || undefined,
      blocks: blocks.map(unionMapForBlock)
    }
  }

  async function handleSave() {
    const input = createInput()

    if (pageID) {
      await updatePage({variables: {id: pageID, input}})

      setChanged(false)
      toaster.push(
        <Notification
          type="success"
          header={t('pageEditor.overview.pageDraftSaved')}
          duration={2000}
        />,
        {placement: 'topEnd'}
      )
      await refetch({id: pageID})
    } else {
      const {data} = await createPage({variables: {input}})

      if (data) {
        dispatch({
          type: RouteActionType.ReplaceRoute,
          route: PageEditRoute.create({id: data?.createPage.id})
        })
      }
      setChanged(false)
      toaster.push(
        <Notification
          type="success"
          header={t('pageEditor.overview.pageDraftCreated')}
          duration={2000}
        />,
        {placement: 'topEnd'}
      )
    }
  }

  async function handlePublish(publishedAt: Date, publishAt: Date, updatedAt?: Date) {
    if (pageID) {
      const {data} = await updatePage({
        variables: {id: pageID, input: createInput()}
      })

      if (data) {
        const {data: publishData} = await publishPage({
          variables: {
            id: pageID,
            publishAt: publishAt ? publishAt.toISOString() : publishedAt.toISOString(),
            publishedAt: publishedAt.toISOString(),
            updatedAt: updatedAt ? updatedAt.toISOString() : publishedAt.toISOString()
          }
        })

        if (publishData?.publishPage?.latest?.publishedAt) {
          setPublishedAt(new Date(publishData?.publishPage?.latest.publishedAt))
        }
        if (publishData?.publishPage?.latest?.updatedAt) {
          setUpdatedAt(new Date(publishData?.publishPage?.latest.updatedAt))
        }
        if (publishData?.publishPage?.latest?.publishAt) {
          setPublishAt(new Date(publishData?.publishPage?.latest.publishAt))
        } else if (
          publishData?.publishPage?.latest?.publishAt === null &&
          publishData?.publishPage?.latest?.publishedAt
        ) {
          setPublishAt(new Date(publishData?.publishPage?.latest?.publishedAt))
        }
      }
      await refetch({id: pageID})
    }

    setChanged(false)
    toaster.push(
      <Notification
        type="success"
        header={t(
          publishAt <= new Date() || (!publishAt && publishedAt <= new Date())
            ? 'pageEditor.overview.pagePublished'
            : 'pageEditor.overview.pagePending'
        )}
        duration={2000}
      />,
      {placement: 'topEnd'}
    )
  }

  useEffect(() => {
    if (isNotFound) {
      toaster.push(
        <Message type="error" showIcon closable duration={0}>
          {t('pageEditor.overview.pageNotFound')}
        </Message>
      )
    }
  }, [isNotFound])

  return (
    <>
      <fieldset style={{borderColor: stateColor}}>
        <legend style={{width: 'auto', margin: '0px auto'}}>
          <Tag style={{backgroundColor: stateColor}}>{tagTitle}</Tag>
        </legend>
        <EditorTemplate
          navigationChildren={
            <NavigationBar
              leftChildren={
                <IconButtonLink
                  style={{marginTop: '4px', marginBottom: '20px'}}
                  size={'lg'}
                  icon={<ArrowLeftIcon />}
                  route={PageListRoute.create({})}
                  onClick={e => {
                    if (!unsavedChangesDialog()) e.preventDefault()
                  }}>
                  {t('Back')}
                </IconButtonLink>
              }
              centerChildren={
                <div style={{marginTop: '4px'}}>
                  <IconButton
                    icon={<NewspaperOIcon />}
                    size={'lg'}
                    disabled={isDisabled}
                    onClick={() => setMetaDrawerOpen(true)}>
                    {t('pageEditor.overview.metadata')}
                  </IconButton>

                  {isNew && createData == null ? (
                    <IconButton
                      style={{
                        marginLeft: '10px'
                      }}
                      size={'lg'}
                      icon={<SaveIcon />}
                      disabled={isDisabled}
                      onClick={() => handleSave()}>
                      {t('pageEditor.overview.create')}
                    </IconButton>
                  ) : (
                    <>
                      <Badge className={hasChanged ? 'unsaved' : 'saved'}>
                        <IconButton
                          style={{
                            marginLeft: '10px'
                          }}
                          size={'lg'}
                          icon={<SaveIcon />}
                          disabled={isDisabled}
                          onClick={() => handleSave()}>
                          {t('pageEditor.overview.save')}
                        </IconButton>
                      </Badge>
                      <Badge
                        className={
                          pageData?.page?.draft || !pageData?.page?.published ? 'unsaved' : 'saved'
                        }>
                        <IconButton
                          style={{
                            marginLeft: '10px'
                          }}
                          size={'lg'}
                          icon={<CloudUploadIcon />}
                          disabled={isDisabled}
                          onClick={() => {
                            setPublishDialogOpen(true)
                          }}>
                          {t('pageEditor.overview.publish')}
                        </IconButton>
                      </Badge>
                    </>
                  )}
                </div>
              }
              rightChildren={
                <IconButtonLink
                  disabled={hasChanged || !id}
                  style={{marginTop: '4px'}}
                  size={'lg'}
                  icon={<EyeIcon />}
                  onClick={e => {
                    previewLinkFetch({
                      variables: {
                        id: id!,
                        hours: 1
                      }
                    })
                  }}>
                  {t('pageEditor.overview.preview')}
                </IconButtonLink>
              }
            />
          }>
          <BlockList value={blocks} onChange={handleChange} disabled={isDisabled}>
            {useBlockMap<BlockValue>(() => BlockMap, [])}
          </BlockList>
        </EditorTemplate>
      </fieldset>
      <Drawer open={isMetaDrawerOpen} size={'sm'} onClose={() => setMetaDrawerOpen(false)}>
        <PageMetadataPanel
          value={metadata}
          onClose={() => {
            handleSave()
            setMetaDrawerOpen(false)
          }}
          onChange={value => {
            setMetadata(value)
            setChanged(true)
          }}
        />
      </Drawer>

      <Modal open={isPublishDialogOpen} size={'sm'} onClose={() => setPublishDialogOpen(false)}>
        <PublishPagePanel
          publishedAtDate={publishedAt}
          updatedAtDate={updatedAt}
          publishAtDate={publishAt}
          pendingPublishDate={pendingPublishDate}
          metadata={metadata}
          onClose={() => setPublishDialogOpen(false)}
          onConfirm={(publishedAt, publishAt, updatedAt) => {
            handlePublish(publishedAt, publishAt, updatedAt)
            setPublishDialogOpen(false)
          }}
        />
      </Modal>
    </>
  )
}
