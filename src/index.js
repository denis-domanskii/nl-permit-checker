const { chromium } = require('playwright');
const notifier = require('node-notifier');

const NL_PERMIT_SCHEDULE_URL = 'https://oap.ind.nl/oap/en/#/doc';
const PERSONS_NUMBER = 2;
const MONTHS_TO_FIND = 3;

const DESK_VALUES = {
    AMSTERDAM: '1: Object',
    DEN_HAAG: '2: Object',
    ZWOLLE: '3: Object',
    DEN_BOSCH: '4: Object'
};

const TIME_OPTIONS = {
    // just use first available
    FIRST: '1: Object'
};

const CHECKING_TIMEOUT = 3000;

const timeFormatter = new Intl.DateTimeFormat(
    'en-us',
    {hour: 'numeric', minute: 'numeric', second: 'numeric'}
);

const log = message => {
    console.log(`[${timeFormatter.format(new Date())}]: ${message}`);
};

const notify = () =>
    notifier.notify({
        title: 'NL Permit appointment available!',
        message: 'Could you please to go to the bot Chromium instance and the filling form',
        sound: true,
        wait: true
    });

const selectDesk = async (page, desk) => {
    await page.selectOption('#desk', desk);
}

const setPersons = async (page, personsNumber) => {
    if (personsNumber <= 1) return;

    const locator = page.locator('.module-number-button.number-up');
    for (let i = 1; i < personsNumber; i++) {
        locator.click();
    }
}

const incrementMonth = async page => {
    await page.locator('available-date-picker button.pull-right').click();
};

const tryToFindAvailableDate = async page => {
    var result = false;
    try {
        // select date
        const locator = page.locator(
            'available-date-picker tbody tr:nth-child(-n+3) button.btn-sm.available'
        ).first();
        await locator.waitFor({timeout: 500});
        await locator.click();

        // select time
        await page.selectOption('#timeSlot', TIME_OPTIONS.FIRST);

        // start filling
        await page.locator(
            'button.pull-right[type="submit"]:has-text("To details")'
        ).click();

        notify();
        result = true;
    } catch (e) {
        log('Not available dates');
    }
    return result;
}

/**
 * @param {import('playwright').Page} page
 */
const check = async page => {
    await page.goto(NL_PERMIT_SCHEDULE_URL);
    log('Page reloaded');

    await selectDesk(page, DESK_VALUES.AMSTERDAM);

    await setPersons(page, PERSONS_NUMBER);

    for (let i = 1; i < MONTHS_TO_FIND; i++) {
        if (await tryToFindAvailableDate(page)) return;
        await incrementMonth(page);
    }

    setTimeout(() => check(page), CHECKING_TIMEOUT);
};

const runChecker = (page) => new Promise(() => {
    check(page);
});

const run = async () => {
    console.log(
        `

!!! Be ready to filling the appointment form  !!!
Could you please prepare:
- your email
- your phone (NL prefer)
- V-number (form IND approval letter)
- First name (which you are using in documents)
- Last name (which you are using in documents)


`
    );
    const browser = await chromium.launch({headless: false});
    const page = await browser.newPage();
    await runChecker(page);
    await browser.close();
};

run();
