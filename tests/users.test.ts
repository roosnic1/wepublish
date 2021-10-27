import { ClientFunction, Selector } from "testcafe";

import {
    admin,
    getPath,
    EDITOR_URL,
    closeButton,
    loginName,
    loginPassword,
    userName,
    userEmail,
    userPassword,
    userNameInput,
    userEmailInput,
    userPasswordInput,
} from "./common"


fixture`Create a user`
    .disablePageCaching
    .beforeEach(async t => {
        await t.useRole(admin)

    })
    .page(`${EDITOR_URL}/users`)

test('create user', async t => {
    await t
        .navigateTo(`${EDITOR_URL}/users`)
        .click(Selector('a').withAttribute('href', '/user/create'))

    await t
        .expect(await getPath()).contains('/user/create')

    await t
        .typeText(userNameInput, userName)
        .typeText(userEmailInput, userEmail)
        .typeText(userPasswordInput, userPassword)
        .click(closeButton)
})

test('try logging in with no role', async t => {
    await t
        .click(Selector('i.rs-icon-cog'))
        .click(Selector('a').withAttribute('href', '/logout'))
        .typeText(loginName, userEmail)
        .typeText(loginPassword, userPassword)
        .click('form > button')
        .expect(Selector('div.rs-alert-container').exists).ok()
})

test('log in as admin and give user an admin role', async t => {
    await t
        .typeText(loginName, 'dev@wepublish.ch')
        .typeText(loginPassword, '123')
        .click('form > button')
        .navigateTo(`${EDITOR_URL}/users`)
        .click(Selector('a').withText(userName))
        .click(Selector('a').withAttribute('name', 'User Roles'))
        .click(Selector('label').withText('Admin'))
        .click(Selector('input').withAttribute('name', 'Preferred Name'))
        .click(Selector('button').withText('Save'))
        .click(Selector('i.rs-icon-cog'))
        .click(Selector('a').withAttribute('href', '/logout'))
})

test('log in with admin role', async t => {
    await t
        .typeText(loginName, userEmail)
        .typeText(loginPassword, userPassword)
        .click('form > button')
        .expect(Selector('i.rs-icon-cog').exists).ok()
})
