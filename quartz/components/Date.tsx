import { GlobalConfiguration } from "../cfg"
import { ValidLocale } from "../i18n"
import { QuartzPluginData } from "../plugins/vfile"

interface Props {
  date: Date
  locale?: ValidLocale
  seed?: string
}

export type ValidDateType = keyof Required<QuartzPluginData>["dates"]

export function getDate(cfg: GlobalConfiguration, data: QuartzPluginData): Date | undefined {
  if (!cfg.defaultDateType) {
    throw new Error(
      `Field 'defaultDateType' was not set in the configuration object of quartz.config.ts. See https://quartz.jzhao.xyz/configuration#general-configuration for more details.`,
    )
  }
  return data.dates?.[cfg.defaultDateType]
}

function archiveDay(d: Date, seed?: string): number {
  // Start from timestamp, then mix in slug chars so same-commit files get different numbers
  let h = d.getTime()
  if (seed) {
    for (let i = 0; i < seed.length; i++) {
      h = Math.imul(h, 31) + seed.charCodeAt(i)
      h |= 0 // keep as 32-bit int
    }
  }
  return (Math.abs(h) % 293) + 1
}

export function formatDate(d: Date, locale: ValidLocale = "en-US"): string {
  return `Día ${archiveDay(d)} de [REDACTADO]`
}

export function Date({ date, locale, seed }: Props) {
  return (
    <time datetime={date.toISOString()}>
      Día {archiveDay(date, seed)} de <span class="redacted">████</span>
    </time>
  )
}
