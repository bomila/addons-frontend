/* @flow */
import makeClassName from 'classnames';
import invariant from 'invariant';
import * as React from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { withRouter } from 'react-router-dom';

import { fetchGroupedRatings } from 'amo/actions/reviews';
import { reviewListURL } from 'amo/reducers/reviews';
import { withFixedErrorHandler } from 'core/errorHandler';
import translate from 'core/i18n/translate';
import LoadingText from 'ui/components/LoadingText';
import IconStar from 'ui/components/IconStar';
import type { GroupedRatingsType } from 'amo/api/reviews';
import type { AppState } from 'amo/store';
import type { AddonType } from 'core/types/addons';
import type { ErrorHandlerType } from 'core/errorHandler';
import type { I18nType } from 'core/types/i18n';
import type { DispatchFunc } from 'core/types/redux';
import type {
  ReactRouterHistoryType,
  ReactRouterLocationType,
} from 'core/types/router';

import './styles.scss';

type Props = {|
  addon: AddonType | null,
|};

type InternalProps = {|
  ...Props,
  clientApp: string,
  dispatch: DispatchFunc,
  errorHandler: ErrorHandlerType,
  groupedRatings?: GroupedRatingsType,
  history: ReactRouterHistoryType,
  i18n: I18nType,
  location: ReactRouterLocationType,
  siteLang: string,
|};

export class RatingsByStarBase extends React.Component<InternalProps> {
  constructor(props: InternalProps) {
    super(props);

    // TODO: this is intended to load on the server (before mount) but it
    // does not.
    // See: https://github.com/mozilla/addons-frontend/issues/5854
    this.loadDataIfNeeded();
  }

  componentDidUpdate() {
    this.loadDataIfNeeded();
  }

  loadDataIfNeeded() {
    const { addon, dispatch, errorHandler, groupedRatings } = this.props;

    if (!errorHandler.hasError() && addon && !groupedRatings) {
      dispatch(
        fetchGroupedRatings({
          addonId: addon.id,
          errorHandlerId: errorHandler.id,
        }),
      );
    }
  }

  renderBarValue(starCount: number) {
    const { addon } = this.props;
    invariant(addon, 'addon is required');

    let width = 0;
    if (addon.ratings && addon.ratings.count > 0) {
      width = Math.round((starCount / addon.ratings.count) * 100);
    }

    return (
      <div
        className={makeClassName(
          'RatingsByStar-bar',
          'RatingsByStar-barValue',
          {
            'RatingsByStar-partialBar': width < 100,
          },
        )}
        style={{ width: `${width}%` }}
      />
    );
  }

  handleRouting(star: string) {
    const { addon, location, history, clientApp, siteLang } = this.props;

    invariant(addon, 'addon was unexpectedly empty');

    history.push(
      `/${siteLang}/${clientApp}${reviewListURL({
        addonSlug: addon.slug,
        score: star,
        src: location.query.src,
      })}`,
    );
  }

  render() {
    const { addon, errorHandler, i18n, groupedRatings } = this.props;
    const loading = (!addon || !groupedRatings) && !errorHandler.hasError();
    const self = this;

    const getLinkTitle = (star, count = '') => {
      switch (star) {
        case '5':
          return i18n.gettext(`Read all ${count} five-star reviews`);
        case '4':
          return i18n.gettext(`Read all ${count} four-star reviews`);
        case '3':
          return i18n.gettext(`Read all ${count} three-star reviews`);
        case '2':
          return i18n.gettext(`Read all ${count} two-star reviews`);
        case '1':
          return i18n.gettext(`Read all ${count} one-star reviews`);
        default:
          return '';
      }
    };

    const createTableRow = (star) => {
      let starCount;
      let starCountNode;

      if (!errorHandler.hasError()) {
        if (groupedRatings) {
          starCount = groupedRatings[star];
        }

        starCountNode = i18n.formatNumber(starCount || 0);
      }

      const rowProps =
        loading || !addon
          ? {}
          : {
              onClick: () => self.handleRouting(star),
              title: getLinkTitle(star, starCount),
            };

      return (
        <tr className="RatingByStar-table-row" {...rowProps}>
          <td className="RatingsByStar-star">
            {!loading ? i18n.formatNumber(star) : <LoadingText width={100} />}
            <IconStar selected />
          </td>
          <td className="RatingsByStar-barContainer">
            {loading ? (
              <div className="RatingsByStar-bar RatingsByStar-barFrame" />
            ) : (
              <div className="RatingsByStar-bar RatingsByStar-barFrame">
                {starCount !== undefined
                  ? this.renderBarValue(starCount)
                  : null}
              </div>
            )}
          </td>
          <td className="RatingsByStar-count">
            {loading ? <LoadingText width={100} /> : starCountNode}
          </td>
        </tr>
      );
    };

    return (
      <div className="RatingsByStar">
        {errorHandler.renderErrorIfPresent()}
        <table className="RatingsByStar-graph">
          <tbody>
            {['5', '4', '3', '2', '1'].map((star) => {
              return (
                <React.Fragment key={star}>
                  {createTableRow(star)}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
}

const mapStateToProps = (state: AppState, ownProps: Props) => {
  let groupedRatings;
  if (ownProps.addon) {
    groupedRatings = state.reviews.groupedRatings[ownProps.addon.id];
  }
  return {
    groupedRatings,
    clientApp: state.api.clientApp,
    siteLang: state.api.lang,
  };
};

export const extractId = (props: Props) => {
  const { addon } = props;
  return addon ? `addon-${addon.id.toString()}` : '';
};

const RatingsByStar: React.ComponentType<Props> = compose(
  withRouter,
  translate(),
  connect(mapStateToProps),
  withFixedErrorHandler({ fileName: __filename, extractId }),
)(RatingsByStarBase);

export default RatingsByStar;
