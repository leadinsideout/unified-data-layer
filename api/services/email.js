/**
 * Email Service
 *
 * Handles email sending via Resend for administrative reports.
 * https://resend.com/docs
 */

import { Resend } from 'resend';

// Initialize Resend client
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

/**
 * Generate HTML email for missing client report
 * @param {Object} reportData - The report data
 * @returns {string} HTML email content
 */
function generateMissingClientReportHtml(reportData) {
  const { period, summary, by_coach, pending_queue } = reportData;

  // Format date range
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Build coach sections
  const coachSections = by_coach.map(coach => `
    <div style="margin-bottom: 24px; padding: 16px; background: #f8f9fa; border-radius: 8px;">
      <h3 style="margin: 0 0 12px 0; color: #1a1a1a; font-size: 16px;">
        ${coach.coach_name}
        <span style="font-weight: normal; color: #666; font-size: 14px;">(${coach.coach_email})</span>
      </h3>
      <p style="margin: 0 0 12px 0; color: #666; font-size: 14px;">
        <strong>${coach.missing_client_count}</strong> transcript${coach.missing_client_count !== 1 ? 's' : ''} missing client assignment
      </p>
      ${coach.unmatched_emails.length > 0 ? `
        <p style="margin: 0 0 12px 0; color: #666; font-size: 14px;">
          <strong>Unmatched emails:</strong> ${coach.unmatched_emails.join(', ')}
        </p>
      ` : ''}
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="border-bottom: 1px solid #ddd;">
            <th style="text-align: left; padding: 8px 4px; color: #666;">Transcript</th>
            <th style="text-align: left; padding: 8px 4px; color: #666;">Date</th>
            <th style="text-align: left; padding: 8px 4px; color: #666;">Unmatched Emails</th>
          </tr>
        </thead>
        <tbody>
          ${coach.transcripts.map(t => `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 4px;">${t.title}</td>
              <td style="padding: 8px 4px;">${formatDate(t.date)}</td>
              <td style="padding: 8px 4px; color: #666;">${t.unmatched_emails.join(', ') || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `).join('');

  // Build pending queue section
  const pendingSection = pending_queue.length > 0 ? `
    <div style="margin-top: 32px;">
      <h2 style="color: #d97706; font-size: 18px; margin-bottom: 16px;">
        Pending Coach Assignment (${pending_queue.length})
      </h2>
      <p style="color: #666; font-size: 14px; margin-bottom: 16px;">
        These transcripts couldn't be matched to any coach and require manual assignment.
      </p>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; background: #fffbeb; border-radius: 8px;">
        <thead>
          <tr style="border-bottom: 1px solid #fcd34d;">
            <th style="text-align: left; padding: 12px 8px; color: #92400e;">Meeting</th>
            <th style="text-align: left; padding: 12px 8px; color: #92400e;">Host Email</th>
            <th style="text-align: left; padding: 12px 8px; color: #92400e;">Created</th>
          </tr>
        </thead>
        <tbody>
          ${pending_queue.map(p => `
            <tr style="border-bottom: 1px solid #fef3c7;">
              <td style="padding: 12px 8px;">${p.title}</td>
              <td style="padding: 12px 8px; color: #666;">${p.host_email || p.organizer_email || '-'}</td>
              <td style="padding: 12px 8px; color: #666;">${formatDate(p.created_at)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Missing Client Report</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 700px; margin: 0 auto; padding: 20px;">

  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 32px; border-radius: 12px 12px 0 0;">
    <h1 style="margin: 0 0 8px 0; font-size: 24px;">Weekly Missing Client Report</h1>
    <p style="margin: 0; opacity: 0.9; font-size: 14px;">
      ${formatDate(period.start)} - ${formatDate(period.end)}
    </p>
  </div>

  <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">

    <!-- Summary Stats -->
    <div style="display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 32px;">
      <div style="flex: 1; min-width: 140px; background: #f0fdf4; padding: 16px; border-radius: 8px; text-align: center;">
        <div style="font-size: 28px; font-weight: bold; color: #16a34a;">${summary.total_transcripts_synced}</div>
        <div style="font-size: 12px; color: #666; text-transform: uppercase;">Transcripts Synced</div>
      </div>
      <div style="flex: 1; min-width: 140px; background: ${summary.transcripts_missing_client > 0 ? '#fef2f2' : '#f0fdf4'}; padding: 16px; border-radius: 8px; text-align: center;">
        <div style="font-size: 28px; font-weight: bold; color: ${summary.transcripts_missing_client > 0 ? '#dc2626' : '#16a34a'};">${summary.transcripts_missing_client}</div>
        <div style="font-size: 12px; color: #666; text-transform: uppercase;">Missing Client</div>
      </div>
      <div style="flex: 1; min-width: 140px; background: ${summary.unique_unmatched_emails > 0 ? '#fffbeb' : '#f0fdf4'}; padding: 16px; border-radius: 8px; text-align: center;">
        <div style="font-size: 28px; font-weight: bold; color: ${summary.unique_unmatched_emails > 0 ? '#d97706' : '#16a34a'};">${summary.unique_unmatched_emails}</div>
        <div style="font-size: 12px; color: #666; text-transform: uppercase;">Unmatched Emails</div>
      </div>
    </div>

    ${summary.transcripts_missing_client === 0 && pending_queue.length === 0 ? `
      <div style="text-align: center; padding: 40px 20px; background: #f0fdf4; border-radius: 8px;">
        <div style="font-size: 48px; margin-bottom: 16px;">&#10003;</div>
        <h2 style="color: #16a34a; margin: 0 0 8px 0;">All Clear!</h2>
        <p style="color: #666; margin: 0;">All transcripts this week have been matched to clients.</p>
      </div>
    ` : `
      <!-- By Coach Breakdown -->
      ${by_coach.length > 0 ? `
        <h2 style="color: #1a1a1a; font-size: 18px; margin-bottom: 16px;">
          Missing Client Assignments by Coach
        </h2>
        ${coachSections}
      ` : ''}

      ${pendingSection}

      <!-- Action Required -->
      <div style="margin-top: 32px; padding: 20px; background: #eff6ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
        <h3 style="margin: 0 0 8px 0; color: #1e40af; font-size: 16px;">Action Required</h3>
        <p style="margin: 0; color: #1e40af; font-size: 14px;">
          Please add the missing clients to the database so future transcripts are automatically assigned.
          You can manage clients in the <a href="https://unified-data-layer.vercel.app/admin.html" style="color: #3b82f6;">Admin Dashboard</a>.
        </p>
      </div>
    `}

  </div>

  <div style="background: #f9fafb; padding: 16px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; text-align: center;">
    <p style="margin: 0; color: #666; font-size: 12px;">
      This is an automated weekly report from the Unified Data Layer.
      <br>
      <a href="https://unified-data-layer.vercel.app/admin.html" style="color: #3b82f6;">View Admin Dashboard</a>
    </p>
  </div>

</body>
</html>
  `.trim();
}

/**
 * Send missing client report email
 * @param {Object} reportData - The report data object
 * @param {string[]} recipients - Array of email addresses
 * @returns {Promise<{success: boolean, error?: string, id?: string}>}
 */
export async function sendMissingClientReport(reportData, recipients) {
  // Check if Resend is configured
  if (!resend) {
    console.warn('[Email] Resend not configured - RESEND_API_KEY missing');
    return {
      success: false,
      error: 'Email service not configured - missing RESEND_API_KEY'
    };
  }

  if (!recipients || recipients.length === 0) {
    return {
      success: false,
      error: 'No recipients specified'
    };
  }

  const html = generateMissingClientReportHtml(reportData);

  // Build subject line
  const { summary } = reportData;
  let subject;
  if (summary.transcripts_missing_client === 0 && summary.pending_coach_assignment === 0) {
    subject = `Weekly Report: All Clear - No Missing Client Assignments`;
  } else {
    const issues = [];
    if (summary.transcripts_missing_client > 0) {
      issues.push(`${summary.transcripts_missing_client} missing client${summary.transcripts_missing_client !== 1 ? 's' : ''}`);
    }
    if (summary.pending_coach_assignment > 0) {
      issues.push(`${summary.pending_coach_assignment} pending assignment${summary.pending_coach_assignment !== 1 ? 's' : ''}`);
    }
    subject = `Weekly Report: ${issues.join(', ')} - Action Required`;
  }

  try {
    // Note: Using Resend's default domain for testing
    // For production with custom domain, verify unified-data-layer.vercel.app in Resend dashboard
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'Unified Data Layer <onboarding@resend.dev>';

    const result = await resend.emails.send({
      from: fromAddress,
      to: recipients,
      subject: subject,
      html: html
    });

    console.log(`[Email] Sent missing client report to ${recipients.length} recipients`, result);

    return {
      success: true,
      id: result.id
    };
  } catch (error) {
    console.error('[Email] Failed to send missing client report:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email'
    };
  }
}

/**
 * Send a test email to verify configuration
 * @param {string} recipient - Email address to send test to
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendTestEmail(recipient) {
  if (!resend) {
    return {
      success: false,
      error: 'Email service not configured - missing RESEND_API_KEY'
    };
  }

  try {
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'Unified Data Layer <onboarding@resend.dev>';

    const result = await resend.emails.send({
      from: fromAddress,
      to: recipient,
      subject: 'Test Email - Unified Data Layer',
      html: `
        <h1>Test Email</h1>
        <p>If you're reading this, email sending is working correctly!</p>
        <p>Sent at: ${new Date().toISOString()}</p>
      `
    });

    return { success: true, id: result.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
