package data;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.ResourceBundle;

import org.smap.sdal.Utilities.ApplicationException;
import org.smap.sdal.Utilities.GeneralUtilityMethods;
import org.smap.sdal.model.Form;

import model.DailyReportsConfig;
import model.ReportColumn;
import model.ReportMultiColumn;

public class DailyReportsManager {
	
	private ResourceBundle localisation = null;
	private String tz;
	
	public DailyReportsManager(ResourceBundle l, String tz) {
		localisation = l;
		if(tz == null) {
			tz = "UTC";
		}
		this.tz = tz;
	}
	
	public void getDailyReport(Connection sd, Connection cResults, DailyReportsConfig config, int year, int month) throws SQLException, ApplicationException {
		
		// Develop
		
		
		StringBuilder sb = new StringBuilder("select ");
		
		PreparedStatement pstmt = null;
		try {
			int sId = GeneralUtilityMethods.getSurveyId(sd, config.sIdent);
			Form tlf = GeneralUtilityMethods.getTopLevelForm(sd, sId);
			String surveyName = GeneralUtilityMethods.getSurveyName(sd, sId);
			
			/*
			 * Validate report configuration
			 * This is required for security as much as error reporting
			 * TODO for all columns
			 */
			if(!GeneralUtilityMethods.hasColumn(cResults, tlf.tableName, config.dateName)) {
				String msg = localisation.getString("qnf").replace("%s1", config.dateName).replace("%s2", surveyName);
				throw new ApplicationException(msg);
			}
			
			sb.append(config.dateName);
			for(ReportColumn rc : config.columns) {
				sb.append(",").append(rc.column);
			}

			for(ReportMultiColumn bar : config.bars) {
				sb.append(",");
				int idx = 0;
				for(String name : bar.columns) {
					if(idx++ > 0) {
						sb.append(" + ");
					}
					sb.append(name);
				}
				sb.append(" as ").append(bar.name);
			}
			
			sb.append(" from ").append(tlf.tableName);
			
			pstmt = cResults.prepareStatement(sb.toString());
			System.out.println(pstmt.toString());
			ResultSet rs = pstmt.executeQuery();
			while(rs.next()) {
				System.out.println(rs.getString("activityintheday"));
			}
		} finally {
			if(pstmt != null) {try{pstmt.close();}catch(Exception e) {}}
		}
	}
}
